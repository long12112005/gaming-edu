/**
 * Bộ công cụ Parser thông minh nhận diện và bóc tách tài liệu câu hỏi:
 * - Trắc nghiệm (QUIZ - 4 phương án)
 * - Ghép cặp (MATCHING - vế trái nối vế phải)
 * - Điền khuyết (FILL_IN_BLANK - câu chứa [...] hoặc từ khóa điền)
 * - Bảng tính Excel / CSV / TSV (Copy paste từ Excel hoặc file)
 */

export interface ParsedOption {
  content: string;
  isCorrect: boolean;
  matchingPair?: string;
  blankKeywords?: string;
}

export interface ParsedSlide {
  type: "QUIZ" | "FILL_IN_BLANK" | "MATCHING";
  questionText: string;
  timeLimit: number;
  points: number;
  options: ParsedOption[];
}

/**
 * 1. Parser nhận diện văn bản tự do (Word / PDF / Text copy)
 */
export function parseRawTextToQuestions(text: string): ParsedSlide[] {
  if (!text || !text.trim()) return [];

  const results: ParsedSlide[] = [];

  // Tách văn bản thành từng khối câu hỏi dựa trên "Câu X:", "Bài X:", "Question X:" hoặc 2 dòng trống liên tiếp
  const rawBlocks = text.split(/(?=(?:^|\n)\s*(?:Câu\s*\d+|Bài\s*\d+|Question\s*\d+|\d+[\.\/\)])\s*[:\.\-])/i);

  for (const rawBlock of rawBlocks) {
    const block = rawBlock.trim();
    if (!block || block.length < 5) continue;

    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const firstLine = lines[0];

    // Kiểm tra định dạng câu hỏi
    const isMatchingBlock =
      /ghép\s*(nối|cặp)|matching|nối\s*cột/i.test(block) ||
      lines.some((l) => /^[A-D\d\w\s\p{L}]+(?:\s*[-–—:]\s*|\s*->\s*)[A-D\d\w\s\p{L}]+$/u.test(l));

    const isFillBlankBlock =
      /điền\s*(vào|từ|chỗ|khuyết)|fill/i.test(block) ||
      /\[\.\.\.\]|\.{3,}|_{3,}/.test(block);

    if (isMatchingBlock && !isFillBlankBlock) {
      // ── BÓC TÁCH CÂU HỎI GHÉP CẶP (MATCHING) ──
      const questionTitle = firstLine.replace(/^(?:Câu\s*\d+|Bài\s*\d+|\d+[\.\/\)])\s*[:\.\-]?\s*/i, "").trim() || "Hãy ghép nối các cặp tương ứng sau:";
      const options: ParsedOption[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Tìm dấu gạch nối hoặc dấu mũi tên: A - B, hoặc A -> B, hoặc A : B
        const match = line.match(/^(.+?)\s*(?:[-–—]|->|:)\s*(.+)$/);
        if (match) {
          const left = match[1].replace(/^[A-Za-z\d][\.\)]\s*/, "").trim();
          const right = match[2].trim();
          if (left && right) {
            options.push({
              content: left,
              matchingPair: right,
              isCorrect: true,
            });
          }
        }
      }

      if (options.length >= 2) {
        results.push({
          type: "MATCHING",
          questionText: questionTitle,
          timeLimit: 45,
          points: 1000,
          options,
        });
        continue;
      }
    }

    if (isFillBlankBlock) {
      // ── BÓC TÁCH CÂU HỎI ĐIỀN KHUYẾT (FILL_IN_BLANK) ──
      let questionTitle = lines[0].replace(/^(?:Câu\s*\d+|Bài\s*\d+|\d+[\.\/\)])\s*[:\.\-]?\s*/i, "").trim();
      let answerKeyword = "";

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const ansMatch = line.match(/^(?:Đáp\s*án|Từ\s*khóa|Key|Answer)\s*[:\.\-]\s*(.+)$/i);
        if (ansMatch) {
          answerKeyword = ansMatch[1].trim();
        } else if (!questionTitle.includes("[...]") && !questionTitle.includes("...")) {
          questionTitle += " " + line;
        }
      }

      // Chuẩn hóa vị trí khuyết thành [...]
      if (questionTitle.includes("...")) {
        questionTitle = questionTitle.replace(/\.{3,}/g, "[...]");
      } else if (questionTitle.includes("___")) {
        questionTitle = questionTitle.replace(/_{3,}/g, "[...]");
      } else if (!questionTitle.includes("[...]")) {
        questionTitle += " [...]";
      }

      if (!answerKeyword) {
        answerKeyword = "Đáp án chuẩn";
      }

      results.push({
        type: "FILL_IN_BLANK",
        questionText: questionTitle,
        timeLimit: 30,
        points: 1000,
        options: [
          {
            content: answerKeyword,
            isCorrect: true,
            blankKeywords: answerKeyword.toLowerCase(),
          },
        ],
      });
      continue;
    }

    // ── MẶC ĐỊNH: BÓC TÁCH CÂU HỎI TRẮC NGHIỆM (QUIZ) ──
    let questionTitle = firstLine.replace(/^(?:Câu\s*\d+|Bài\s*\d+|\d+[\.\/\)])\s*[:\.\-]?\s*/i, "").trim();
    const options: ParsedOption[] = [];
    let correctKey = "";

    // Tìm dòng "Đáp án: A" ở cuối nếu có
    for (const line of lines) {
      const ansMatch = line.match(/^(?:Đáp\s*án|ĐA|Key|Answer)\s*[:\.\-]?\s*([A-D])/i);
      if (ansMatch) {
        correctKey = ansMatch[1].toUpperCase();
      }
    }

    // Thu thập các phương án A, B, C, D
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^(?:Đáp\s*án|ĐA|Key|Answer)/i.test(line)) continue;

      // Phương án dạng: A. Nội dung, A) Nội dung hoặc *A. Nội dung (dấu sao biểu thị đáp án đúng)
      const optMatch = line.match(/^(\*)?\s*([A-D])[\.\)]\s*(.+)$/i);
      if (optMatch) {
        const isStar = !!optMatch[1];
        const key = optMatch[2].toUpperCase();
        const content = optMatch[3].trim();
        const isCorrect = isStar || (correctKey ? key === correctKey : false);

        options.push({
          content,
          isCorrect,
        });
      } else if (options.length === 0) {
        // Nếu chưa bắt đầu vào option thì đây là nội dung nối tiếp của tiêu đề câu hỏi
        questionTitle += " " + line;
      }
    }

    // Nếu chưa đánh dấu đáp án đúng nào, mặc định câu đầu tiên đúng hoặc câu theo correctKey
    if (options.length >= 2) {
      const hasCorrect = options.some((o) => o.isCorrect);
      if (!hasCorrect && correctKey) {
        const charIdx = correctKey.charCodeAt(0) - 65; // A=0, B=1, ...
        if (options[charIdx]) options[charIdx].isCorrect = true;
      } else if (!hasCorrect) {
        options[0].isCorrect = true;
      }

      results.push({
        type: "QUIZ",
        questionText: questionTitle,
        timeLimit: 30,
        points: 1000,
        options,
      });
    }
  }

  return results;
}

/**
 * 2. Parser bảng tính Excel / CSV / TSV (hỗ trợ copy-paste từ Excel hoặc tải file .csv)
 */
export function parseSpreadsheetToQuestions(content: string): ParsedSlide[] {
  if (!content || !content.trim()) return [];

  // Tự động nhận diện phân cách bằng dấu Tab (\t) nếu copy từ Excel, hoặc dấu phẩy (,) nếu là CSV
  const delimiter = content.includes("\t") ? "\t" : ",";
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length === 0) return [];

  const results: ParsedSlide[] = [];

  // Kiểm tra nếu dòng 1 là tiêu đề cột thì bỏ qua
  let startIndex = 0;
  if (/loại|type|câu hỏi|question|dạng/i.test(lines[0])) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    // Phân tách các cột, xử lý dấu ngoặc kép nếu có
    const cols = parseCsvLine(line, delimiter);
    if (cols.length < 3) continue;

    const rawType = cols[0].toUpperCase().trim();
    const questionText = cols[1].trim();
    if (!questionText) continue;

    if (rawType.includes("MATCH") || rawType.includes("GHÉP")) {
      // Dạng Ghép cặp: Cột 2 là cặp 1 (A-B), Cột 3 là cặp 2 (C-D), Cột 4 là cặp 3, Cột 5 là cặp 4
      const options: ParsedOption[] = [];
      for (let c = 2; c < Math.min(cols.length, 6); c++) {
        const pairStr = cols[c]?.trim();
        if (!pairStr) continue;
        const parts = pairStr.split(/[-–—:]/);
        if (parts.length >= 2) {
          options.push({
            content: parts[0].trim(),
            matchingPair: parts[1].trim(),
            isCorrect: true,
          });
        }
      }
      if (options.length >= 2) {
        results.push({
          type: "MATCHING",
          questionText,
          timeLimit: 45,
          points: 1000,
          options,
        });
      }
    } else if (rawType.includes("BLANK") || rawType.includes("ĐIỀN") || rawType.includes("KHUYẾT")) {
      // Dạng Điền khuyết: Cột 2 là đáp án chuẩn, Cột 3 là các từ khóa biến thể (phân cách bởi phẩy)
      const keyword = cols[2]?.trim() || "Đáp án";
      const altKeywords = cols[3]?.trim() || keyword;

      results.push({
        type: "FILL_IN_BLANK",
        questionText: questionText.includes("[...]") ? questionText : `${questionText} [...]`,
        timeLimit: 30,
        points: 1000,
        options: [
          {
            content: keyword,
            isCorrect: true,
            blankKeywords: altKeywords,
          },
        ],
      });
    } else {
      // Mặc định Trắc nghiệm:
      // Cột 2: Đáp án Đúng (Phương án 1)
      // Cột 3: Phương án Sai 1
      // Cột 4: Phương án Sai 2
      // Cột 5: Phương án Sai 3
      const options: ParsedOption[] = [];
      if (cols[2]?.trim()) options.push({ content: cols[2].trim(), isCorrect: true });
      if (cols[3]?.trim()) options.push({ content: cols[3].trim(), isCorrect: false });
      if (cols[4]?.trim()) options.push({ content: cols[4].trim(), isCorrect: false });
      if (cols[5]?.trim()) options.push({ content: cols[5].trim(), isCorrect: false });

      if (options.length >= 2) {
        results.push({
          type: "QUIZ",
          questionText,
          timeLimit: 30,
          points: 1000,
          options,
        });
      }
    }
  }

  return results;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * 3. Tạo và tải file mẫu Excel (.csv) hỗ trợ cả 3 dạng câu hỏi có UTF-8 BOM
 */
export function downloadSampleCsvTemplate() {
  const header = "Loại Câu Hỏi,Nội Dung Câu Hỏi,Đáp Án Đúng / Cặp 1,Phương Án Sai 1 / Cặp 2,Phương Án Sai 2 / Cặp 3,Phương Án Sai 3 / Cặp 4,Thời Gian (Giây)\n";
  const rows = [
    'QUIZ,"Thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là gì?","Hà Nội","TP. Hồ Chí Minh","Đà Nẵng","Cần Thơ",30',
    'QUIZ,"Đơn vị cơ bản cấu tạo nên mọi sự sống là gì?","Tế bào","Phân tử","Nguyên tử","Mô tế bào",30',
    'FILL_IN_BLANK,"Giao thức truyền tải siêu văn bản an toàn trên Internet có tên viết tắt là [...]","HTTPS","https, http secure",,,30',
    'MATCHING,"Hãy ghép nối các thủ đô với quốc gia tương ứng:","Hà Nội - Việt Nam","Tokyo - Nhật Bản","Paris - Pháp","Seoul - Hàn Quốc",45',
  ].join("\n");

  const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "GameEdu_Mau_Nhap_De_Thi_Hang_Loat.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
