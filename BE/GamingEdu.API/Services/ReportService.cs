using ClosedXML.Excel;
using GamingEdu.API.Data;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Services;

public interface IReportService
{
    Task<byte[]> GenerateRoomReportAsync(Guid roomId, Guid hostId);
}

public class ReportService : IReportService
{
    private readonly ApplicationDbContext _db;

    public ReportService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<byte[]> GenerateRoomReportAsync(Guid roomId, Guid hostId)
    {
        // Query toàn bộ dữ liệu phòng, người chơi, và chi tiết từng câu trả lời
        var room = await _db.Rooms
            .Include(r => r.Quiz)
                .ThenInclude(q => q.Slides.Where(s => s.Status == "PUBLISHED").OrderBy(s => s.OrderIndex))
            .Include(r => r.Players)
                .ThenInclude(p => p.Responses)
            .FirstOrDefaultAsync(r => r.Id == roomId)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng chơi.");

        if (room.HostId != hostId)
            throw new UnauthorizedAccessException("Bạn không có quyền xuất báo cáo của phòng này.");

        using var workbook = new XLWorkbook();

        // ─── SHEET 1: TỔNG QUAN ─────────────────────────────────────────────
        var wsSummary = workbook.Worksheets.Add("Tổng quan");
        
        wsSummary.Cell("A1").Value = "BÁO CÁO PHÒNG CHƠI";
        wsSummary.Cell("A1").Style.Font.Bold = true;
        wsSummary.Cell("A1").Style.Font.FontSize = 16;
        wsSummary.Range("A1:C1").Merge();

        wsSummary.Cell("A3").Value = "Mã PIN:";
        wsSummary.Cell("B3").Value = room.PinCode;
        wsSummary.Cell("A4").Value = "Bộ đề:";
        wsSummary.Cell("B4").Value = room.Quiz?.Title;
        wsSummary.Cell("A5").Value = "Ngày chơi:";
        wsSummary.Cell("B5").Value = room.CreatedAt.ToString("dd/MM/yyyy HH:mm");

        // Header bảng tổng quan
        string[] summaryHeaders = { "Hạng", "Nickname", "Tổng Điểm", "Số câu đúng", "Tỉ lệ đúng (%)" };
        for (int i = 0; i < summaryHeaders.Length; i++)
        {
            var cell = wsSummary.Cell(7, i + 1);
            cell.Value = summaryHeaders[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.LightBlue;
        }

        var players = room.Players.OrderByDescending(p => p.TotalScore).ToList();
        var totalSlides = room.Quiz?.Slides.Count ?? 0;

        int row = 8;
        for (int i = 0; i < players.Count; i++)
        {
            var player = players[i];
            var correctCount = player.Responses.Count(r => r.IsCorrect);
            var accuracy = totalSlides > 0 ? (double)correctCount / totalSlides * 100 : 0;

            wsSummary.Cell(row, 1).Value = i + 1;
            wsSummary.Cell(row, 2).Value = player.Nickname;
            wsSummary.Cell(row, 3).Value = player.TotalScore;
            wsSummary.Cell(row, 4).Value = correctCount;
            wsSummary.Cell(row, 5).Value = Math.Round(accuracy, 2);
            row++;
        }
        wsSummary.Columns().AdjustToContents();

        // ─── SHEET 2: CHI TIẾT TỪNG CÂU ────────────────────────────────────
        if (totalSlides > 0)
        {
            var wsDetails = workbook.Worksheets.Add("Chi tiết");
            
            wsDetails.Cell(1, 1).Value = "Nickname";
            wsDetails.Cell(1, 1).Style.Font.Bold = true;
            wsDetails.Cell(1, 1).Style.Fill.BackgroundColor = XLColor.LightGray;

            var slides = room.Quiz!.Slides.ToList();
            
            // Header cột cho từng câu hỏi
            for (int i = 0; i < slides.Count; i++)
            {
                var cell = wsDetails.Cell(1, i + 2);
                cell.Value = $"Câu {i + 1} ({slides[i].Type})";
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.LightGray;
            }

            int detailRow = 2;
            foreach (var player in players)
            {
                wsDetails.Cell(detailRow, 1).Value = player.Nickname;

                for (int i = 0; i < slides.Count; i++)
                {
                    var response = player.Responses.FirstOrDefault(r => r.SlideId == slides[i].Id);
                    var cell = wsDetails.Cell(detailRow, i + 2);
                    
                    if (response != null)
                    {
                        string resultMark = response.IsCorrect ? "Đúng" : "Sai";
                        cell.Value = $"{resultMark} ({response.ScoreAwarded} điểm)\nTrả lời: {response.AnswerData}";
                        cell.Style.Alignment.WrapText = true;
                        if (response.IsCorrect) cell.Style.Font.FontColor = XLColor.Green;
                        else cell.Style.Font.FontColor = XLColor.Red;
                    }
                    else
                    {
                        cell.Value = "Bỏ qua";
                        cell.Style.Font.FontColor = XLColor.Gray;
                    }
                }
                detailRow++;
            }
            wsDetails.Columns().AdjustToContents();
            // Đặt chiều rộng tối đa cho các cột chi tiết để tránh quá dài do WrapText
            for (int i = 0; i < slides.Count; i++)
            {
                wsDetails.Column(i + 2).Width = 30;
            }
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }
}
