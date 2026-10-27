# MÔ TẢ CHI TIẾT TRÒ CHƠI HẢI CHIẾN TRI THỨC

## 1. Tổng quan trò chơi

**Tên trò chơi:** Hải Chiến Tri Thức (Edu Naval War)

**Thể loại:** Game giáo dục, chiến thuật, đối kháng PvP và trắc nghiệm kiến thức.

**Nền tảng:** Web.

**Số lượng người chơi:** Tối thiểu 2 người và tối đa 50 người trong một phòng.

**Mục tiêu:** Kết hợp việc trả lời câu hỏi kiến thức với chiến thuật tìm kiếm, bắn phá và đánh chìm tàu chiến của đối phương.

Hải Chiến Tri Thức là trò chơi đối kháng giáo dục lấy cảm hứng từ trò chơi Bắn tàu chiến. Thay vì chỉ dựa vào việc lựa chọn tọa độ để tấn công, người chơi phải trả lời chính xác các câu hỏi do hệ thống cung cấp mới có thể sử dụng lượt bắn của mình.

Mỗi trận đấu diễn ra trên một vùng biển được chia thành các ô vuông. Mỗi đội sở hữu một bản đồ riêng, trong đó các tàu chiến được hệ thống bố trí ngẫu nhiên. Người chơi không thể trực tiếp nhìn thấy vị trí tàu còn nguyên của đối phương mà phải dựa vào kết quả các lượt bắn để suy luận và xác định mục tiêu.

Trò chơi hỗ trợ hai hình thức chính: đấu tay đôi giữa hai người chơi và đấu đội nhóm với tối đa 50 người trong một phòng. Trong cả hai hình thức, nhiệm vụ chung là bảo vệ đội tàu của mình, tìm kiếm tàu đối phương và đánh chìm toàn bộ đội tàu địch trước khi bị tiêu diệt.

Bên cạnh cơ chế chiến đấu cơ bản, trò chơi còn có các tính năng chiến thuật đặc biệt như Radar dò tìm, Bắn chính xác, Lá chắn phòng thủ và Combo kiến thức. Hệ thống đồng thời ghi nhận thành tích cá nhân để tạo động lực học tập và thi đấu.

## 2. Bản đồ và hệ thống tàu chiến

### 2.1. Bản đồ chiến đấu

Bản đồ trò chơi được thiết kế dưới dạng lưới ô vuông mô phỏng mặt biển. Mỗi ô có thể chứa một phần của tàu chiến hoặc chỉ là vùng nước trống.

Hai bên sở hữu hai bản đồ độc lập. Bản đồ của đội mình hiển thị vị trí tàu và trạng thái sát thương, trong khi bản đồ đối phương chỉ hiển thị những ô đã được bắn và kết quả tương ứng.

Kích thước bản đồ được cấu hình dựa trên số lượng người chơi, số câu hỏi và thời lượng trận đấu mong muốn. Hệ thống cần bảo đảm bản đồ đủ rộng để tạo yếu tố tìm kiếm nhưng không quá lớn khiến trận đấu kéo dài.

Ví dụ, trong một trận đấu tay đôi có 15 câu hỏi, chủ phòng có thể thiết lập bản đồ 20×20 theo quy tắc của chế độ chơi. Với các trận đấu ngắn hơn, hệ thống có thể đề xuất bản đồ nhỏ hơn nhằm tăng khả năng tương tác và hạn chế việc bắn trượt quá nhiều lần.

Mỗi ô trên bản đồ được xác định bằng tọa độ hàng và cột để người chơi lựa chọn mục tiêu. Sau khi một ô đã được bắn hợp lệ, ô đó được đánh dấu và không thể bị chọn lại.

### 2.2. Hệ thống năm tàu chiến

Mỗi đội sở hữu năm tàu chiến có kích thước khác nhau. Mỗi tàu được cấu tạo từ một hoặc nhiều ô liền kề trên bản đồ.

- Tàu số 1: Kích thước 1 ô.
- Tàu số 2: Kích thước 2 ô.
- Tàu số 3: Kích thước 3 ô.
- Tàu số 4: Kích thước 4 ô.
- Tàu số 5: Kích thước 5 ô.

Tổng diện tích đội tàu là 15 ô. Mỗi ô tàu có thể bị bắn trúng độc lập. Khi tất cả các ô cấu thành một tàu đều bị bắn trúng, tàu đó được xác định là đã bị đánh chìm.

Hệ thống có thể hiển thị loại tàu và trạng thái của tàu đã bị đánh chìm, nhưng không tiết lộ vị trí đầy đủ của những tàu đối phương chưa bị phát hiện.

### 2.3. Cơ chế bố trí tàu ngẫu nhiên

Khi trận đấu bắt đầu, máy chủ tự động tạo vị trí cho toàn bộ tàu của hai đội.

Việc bố trí phải tuân thủ các quy tắc:

- Tàu chỉ được đặt theo chiều ngang hoặc chiều dọc.
- Toàn bộ tàu phải nằm bên trong giới hạn bản đồ.
- Các tàu không được chồng lên nhau.
- Mỗi ô chỉ được chứa tối đa một phần tàu.
- Vị trí tàu được tạo và lưu trữ ở phía máy chủ.
- Người chơi không được phép tự thay đổi vị trí tàu sau khi trận đấu bắt đầu.

Cơ chế này giúp bảo đảm hai bên không biết trước vị trí tàu của nhau, giảm khả năng gian lận và tạo ra trải nghiệm chiến đấu khác nhau trong mỗi trận.

## 3. Cơ chế câu hỏi và lượt bắn

### 3.1. Hệ thống câu hỏi

Câu hỏi được lấy từ bộ đề do chủ phòng lựa chọn hoặc tạo trước trận đấu. Bộ đề có thể bao gồm nhiều dạng câu hỏi như trắc nghiệm, điền khuyết, nối cặp và tự luận.

Mỗi câu hỏi có đáp án hoặc quy tắc chấm điểm được xác định trước khi người chơi trả lời. Đối với câu hỏi khách quan, hệ thống có thể tự động kiểm tra đáp án. Đối với câu hỏi tự luận, hệ thống chỉ nên cấp quyền bắn sau khi câu trả lời được chấm theo tiêu chí đã xác định.

Khi một câu hỏi xuất hiện, người chơi được cấp một khoảng thời gian để trả lời. Hệ thống ghi nhận nội dung câu trả lời, kết quả đúng hoặc sai và thời gian hoàn thành.

### 3.2. Điều kiện nhận lượt bắn

Người chơi hoặc đội chơi chỉ được cấp quyền bắn khi đáp ứng điều kiện của chế độ đang tham gia.

Đối với chế độ đấu tay đôi, hai người chơi lần lượt trả lời câu hỏi. Người đang đến lượt nếu trả lời đúng sẽ được lựa chọn một ô trên bản đồ đối phương để bắn. Nếu trả lời sai hoặc hết thời gian, lượt đó bị mất và quyền chơi được chuyển sang đối phương.

Đối với chế độ đội nhóm, thành viên đại diện hai đội lần lượt trả lời theo lịch luân phiên. Có thể áp dụng quy tắc mỗi lượt chỉ cho phép một phát bắn của đội nhằm bảo đảm sự cân bằng. Khi cần tăng nhịp độ cho phòng đông người, chủ phòng có thể chọn chế độ hai đội cùng trả lời một câu hỏi, trong đó mỗi đội trả lời đúng được nhận một quyền bắn theo luật của chế độ.

Trong mọi trường hợp, một câu hỏi chỉ được xử lý theo số lượt bắn tối đa đã quy định. Người chơi không được trả lời lặp lại để liên tục nhận thêm quyền bắn từ cùng một câu hỏi.

### 3.3. Xử lý kết quả phát bắn

Sau khi được cấp quyền bắn, người chơi chọn một ô chưa được khai hỏa trên bản đồ đối phương.

Hệ thống kiểm tra tọa độ và xác định kết quả:

- Nếu ô được chọn không có tàu, hệ thống thông báo bắn trượt và đánh dấu ô nước đã bị bắn.
- Nếu ô có phần tàu, hệ thống thông báo bắn trúng và ghi nhận sát thương.
- Nếu toàn bộ ô của một tàu đã bị bắn trúng, hệ thống thông báo tàu đó bị đánh chìm.
- Nếu toàn bộ tàu của đối phương đã bị đánh chìm, trận đấu kết thúc và đội còn hoàn thành điều kiện chiến thắng sẽ giành chiến thắng.

Kết quả phát bắn được đồng bộ theo thời gian thực đến các thành viên liên quan. Người chơi không thể bắn lại vào một ô đã được khai hỏa, kể cả khi lần bắn trước đó không trúng tàu.

## 4. Năm tính năng bổ sung

### 4.1. Tính năng 1: Radar dò tìm

Radar dò tìm là tính năng hỗ trợ người chơi xác định khu vực có khả năng chứa tàu đối phương mà không tiết lộ trực tiếp toàn bộ vị trí tàu.

Khi đủ điều kiện sử dụng, người chơi có thể lựa chọn một vùng trên bản đồ đối phương để tiến hành quét. Hệ thống kiểm tra vùng được chọn và trả về thông tin tổng quát, chẳng hạn như khu vực đó có phần tàu hay không.

Radar không tự động gây sát thương và cũng không thay thế quyền bắn thông thường. Sau khi nhận kết quả quét, người chơi vẫn phải trả lời câu hỏi đúng để nhận quyền bắn vào tọa độ mong muốn.

Radar có thể được cấp thông qua một số điều kiện như đạt mốc điểm kiến thức, trả lời đúng liên tiếp hoặc tích lũy đủ năng lượng. Chủ phòng có thể điều chỉnh số lần sử dụng để bảo đảm cân bằng.

Các quy tắc cần áp dụng:

- Radar không được tiết lộ toàn bộ vị trí tàu của đối phương.
- Kết quả quét chỉ hiển thị cho người hoặc đội sử dụng.
- Radar có giới hạn số lần sử dụng trong mỗi trận.
- Không thể sử dụng Radar liên tục vượt quá số lần cho phép.
- Hệ thống phải kiểm tra quyền sử dụng ở phía máy chủ.

Tính năng này bổ sung yếu tố suy luận chiến thuật, giúp người chơi lựa chọn mục tiêu có cơ sở hơn thay vì hoàn toàn bắn ngẫu nhiên.

### 4.2. Tính năng 2: Bắn chính xác

Bắn chính xác là kỹ năng hỗ trợ tấn công được mở khóa khi người chơi đạt một điều kiện nhất định, chẳng hạn như trả lời đúng liên tiếp một số câu hỏi hoặc hoàn thành một mục tiêu trong trận đấu.

Khi kỹ năng sẵn sàng, hệ thống thông báo cho người chơi biết họ có thể kích hoạt một lượt bắn chính xác. Người chơi vẫn phải chọn tọa độ trên bản đồ đối phương và tuân thủ điều kiện cấp quyền bắn của chế độ hiện tại.

Để tránh làm mất cân bằng game, Bắn chính xác không nên tự động cho biết vị trí tàu thật. Kỹ năng có thể được thiết kế theo một trong các cách sau:

- Hỗ trợ đánh dấu một ô nghi ngờ để người chơi dễ nhận biết mục tiêu đang theo dõi.
- Cho phép xác nhận mục tiêu trước khi thực hiện phát bắn, giảm nguy cơ chọn nhầm tọa độ do thao tác.
- Cấp một lượt bắn đặc biệt có giới hạn nhưng không được sử dụng lặp lại trong cùng một chuỗi câu hỏi.

Đối với phiên bản đầu tiên, nên chọn một cách triển khai duy nhất để luật chơi dễ hiểu và dễ kiểm thử.

Mọi lần sử dụng kỹ năng đều phải được ghi nhận. Kỹ năng không được phép bỏ qua luật không bắn trùng ô và không được sử dụng nếu chưa đáp ứng đủ điều kiện.

### 4.3. Tính năng 3: Lá chắn phòng thủ

Lá chắn phòng thủ là kỹ năng bảo vệ đội tàu trước một đòn tấn công hợp lệ của đối phương.

Người chơi hoặc đội chơi có thể nhận Lá chắn sau khi hoàn thành một điều kiện trong trận đấu. Khi kích hoạt thành công, lá chắn được áp dụng theo phạm vi và thời hạn đã quy định.

Để giữ luật chơi đơn giản, phiên bản đầu có thể sử dụng quy tắc: một lá chắn bảo vệ một ô tàu khỏi một phát bắn. Khi một phát bắn trúng ô đang được bảo vệ, hệ thống áp dụng hiệu ứng lá chắn, không ghi nhận sát thương vào ô tàu đó và thông báo kết quả cho các bên theo quy tắc hiển thị của trò chơi.

Sau khi chặn một đòn hợp lệ, lá chắn bị tiêu hao và không thể tiếp tục sử dụng. Lá chắn không bảo vệ toàn bộ đội tàu cùng lúc và không thể được tích lũy vượt quá giới hạn quy định.

Các quy tắc cần áp dụng:

- Mỗi đội chỉ được sở hữu số lượng lá chắn tối đa do chủ phòng thiết lập.
- Một ô chỉ được hưởng hiệu ứng của một lá chắn tại một thời điểm.
- Lá chắn không thể ngăn trận đấu kết thúc nếu điều kiện thắng đã được xác lập trước đó.
- Máy chủ quyết định trạng thái kích hoạt, tiêu hao và hiệu quả của lá chắn.
- Hiệu ứng cần được thông báo rõ ràng để người chơi hiểu vì sao phát bắn không gây sát thương.

Tính năng này tạo cơ hội phòng thủ và giúp đội đang gặp bất lợi có thêm lựa chọn chiến thuật.

### 4.4. Tính năng 4: Combo kiến thức

Combo kiến thức là hệ thống thưởng cho việc trả lời đúng liên tiếp các câu hỏi. Tính năng khuyến khích người chơi tập trung, nắm vững kiến thức và duy trì phong độ trong trận đấu.

Mỗi người chơi hoặc đội có một bộ đếm combo. Khi trả lời đúng, bộ đếm tăng lên một đơn vị. Khi trả lời sai hoặc hết thời gian, combo được thiết lập lại theo quy tắc của chế độ.

Ví dụ, hệ thống có thể đặt các mốc như sau:

- Đúng liên tiếp 2 câu: nhận thông báo chuỗi trả lời chính xác.
- Đúng liên tiếp 3 câu: nhận một lượng năng lượng thưởng.
- Tích lũy đủ năng lượng: mở khóa một kỹ năng đặc biệt đã được quy định, chẳng hạn Radar hoặc Bắn chính xác.

Các mốc trên là giá trị tham khảo và có thể được điều chỉnh trong phần cài đặt trận đấu.

Combo cần được thiết kế theo hướng thưởng cho kiến thức mà không tạo ra lợi thế quá lớn. Hệ thống không nên tự động cho phép người chơi bắn vô hạn hoặc gây sát thương không giới hạn chỉ vì trả lời đúng liên tiếp.

Trong chế độ đội nhóm, chủ phòng có thể chọn combo cá nhân hoặc combo chung của cả đội. Combo cá nhân ghi nhận thành tích của từng thành viên; combo đội ghi nhận chuỗi câu hỏi đúng của đội theo quy tắc đã thống nhất.

Sau mỗi lần tăng hoặc mất combo, giao diện cần hiển thị trạng thái hiện tại, số câu đúng liên tiếp và điều kiện để đạt mốc thưởng tiếp theo.

### 4.5. Tính năng 5: Bảng xếp hạng cá nhân

Bảng xếp hạng cá nhân là chức năng ghi nhận mức độ đóng góp của mỗi người chơi trong một trận đấu, đặc biệt quan trọng khi có nhiều người cùng tham gia một đội.

Hệ thống ghi nhận các dữ liệu như:

- Tổng số câu hỏi đã trả lời.
- Số câu trả lời đúng và sai.
- Tỷ lệ trả lời đúng.
- Thời gian trả lời trung bình.
- Số lượt bắn hợp lệ.
- Số lần bắn trúng tàu.
- Số tàu được góp phần đánh chìm.
- Số lần sử dụng kỹ năng đặc biệt có hiệu quả.

Sau khi trận đấu kết thúc, hệ thống tổng hợp dữ liệu và tính điểm thành tích cá nhân. Người chơi được sắp xếp theo quy tắc tính điểm đã công bố trước trận.

Điểm xếp hạng cá nhân nên ưu tiên mức độ chính xác của câu trả lời và sự đóng góp thực tế vào trận đấu. Tốc độ trả lời chỉ nên là tiêu chí bổ sung, tránh tạo bất lợi cho những người cần thêm thời gian suy nghĩ.

Bảng xếp hạng có thể hiển thị tên người chơi, đội tham gia, điểm thành tích, tỷ lệ trả lời đúng và các chỉ số đóng góp. Ngoài bảng xếp hạng toàn phòng, trò chơi có thể làm nổi bật một số thành tích như người trả lời chính xác nhất, người bắn trúng nhiều nhất hoặc người có đóng góp chiến thuật nổi bật.

Chức năng này giúp chủ phòng đánh giá kết quả học tập, khuyến khích tinh thần thi đấu và tăng tính cạnh tranh lành mạnh giữa các thành viên. Các chỉ số cần được lấy từ dữ liệu trận đấu do máy chủ ghi nhận để hạn chế việc sửa kết quả từ phía trình duyệt.

## 5. Điều kiện kết thúc và xác định đội chiến thắng

### 5.1. Kết thúc trận đấu bình thường

Trận đấu kết thúc ngay khi một đội đánh chìm toàn bộ năm tàu của đối phương. Đội còn tàu và đáp ứng điều kiện chiến thắng được tuyên bố là đội chiến thắng.

Hệ thống ngừng cấp câu hỏi và quyền bắn mới, khóa các thao tác chiến đấu, tổng hợp kết quả trận đấu và hiển thị bảng thành tích.

### 5.2. Chủ phòng kết thúc trận đấu sớm

Chủ phòng có thể chủ động kết thúc trận đấu trước khi một bên bị đánh chìm toàn bộ tàu. Khi đó, hệ thống chuyển trận đấu sang trạng thái kết thúc sớm và xác định kết quả dựa trên các tiêu chí theo thứ tự ưu tiên:

- Số tàu đối phương đã bị đánh chìm.
- Tổng số ô tàu đối phương đã bị bắn trúng.
- Tỷ lệ trả lời đúng của đội.
- Tổng thời gian trả lời hợp lệ.

Đội có thành tích tốt hơn theo tiêu chí ưu tiên cao nhất sẽ thắng. Nếu các tiêu chí lần lượt bằng nhau, hệ thống mới xét tiêu chí kế tiếp.

Nếu tất cả tiêu chí vẫn bằng nhau, trận đấu được công nhận hòa thay vì tự động trao chiến thắng cho một bên.

Việc chủ phòng kết thúc sớm phải được ghi nhận trong lịch sử trận đấu. Chủ phòng không được phép sửa kết quả hoặc điểm số đã được máy chủ xác định.

### 5.3. Tổng kết trận đấu

Sau trận đấu, màn hình kết quả hiển thị:

- Đội chiến thắng hoặc kết quả hòa.
- Số tàu còn lại của mỗi đội.
- Số tàu đối phương bị đánh chìm.
- Tổng số ô tàu bị bắn trúng.
- Tổng số câu hỏi đúng và sai.
- Thống kê combo và kỹ năng đã sử dụng.
- Bảng xếp hạng thành tích cá nhân.

Nếu trận đấu được tổ chức trong một lớp học, chủ phòng có thể sử dụng kết quả để xem lại mức độ tham gia và độ chính xác của người chơi.

## 6. Giao diện và trải nghiệm người chơi

Giao diện trò chơi nên được bố trí trực quan, giúp người chơi dễ theo dõi diễn biến trận chiến đồng thời trả lời câu hỏi.

### 6.1. Khu vực bản đồ

Hiển thị lưới ô vuông, tọa độ, trạng thái các ô đã bắn, kết quả trúng hoặc trượt và tình trạng đội tàu.

Đối với chế độ đấu tay đôi, có thể bố trí bản đồ của mình và bản đồ đối phương cạnh nhau. Đối với chế độ đội nhóm đông người, bản đồ mục tiêu cần được ưu tiên diện tích hiển thị để người chơi thao tác thuận tiện.

### 6.2. Khu vực câu hỏi

Hiển thị nội dung câu hỏi, các phương án trả lời hoặc ô nhập câu trả lời, đồng hồ đếm ngược và thông báo kết quả.

Sau khi trả lời, giao diện cần chỉ rõ người chơi đã trả lời đúng, sai hoặc hết thời gian. Đồng thời, hệ thống thông báo quyền bắn có được cấp hay không.

### 6.3. Khu vực trạng thái chiến đấu

Hiển thị số tàu còn hoạt động, số tàu đã đánh chìm, tình trạng lá chắn, trạng thái combo và các kỹ năng đang sẵn sàng sử dụng.

Những thông tin về tàu đối phương phải tuân thủ luật che giấu dữ liệu của trò chơi. Giao diện chỉ được hiển thị các thông tin mà người chơi có quyền biết.

### 6.4. Khu vực thông báo và xếp hạng

Hiển thị các sự kiện quan trọng như bắn trúng, bắn trượt, đánh chìm tàu, kích hoạt Radar, sử dụng Lá chắn và thay đổi combo.

Bảng xếp hạng cá nhân được hiển thị trong hoặc sau trận đấu tùy chế độ, giúp người chơi hiểu rõ đóng góp của mình vào kết quả chung.

## 7. Yêu cầu về tính công bằng và bảo mật

Toàn bộ logic quan trọng của trò chơi phải được xử lý ở phía máy chủ, bao gồm việc tạo vị trí tàu, kiểm tra câu trả lời, cấp quyền bắn, xác định kết quả tấn công, xử lý kỹ năng và tính điểm.

Frontend chỉ chịu trách nhiệm hiển thị giao diện, nhận thao tác của người chơi và gửi yêu cầu đến máy chủ. Người chơi không được tự gửi kết quả đúng, tự xác nhận phát bắn trúng hoặc chỉnh sửa điểm số.

Máy chủ cần xác thực người chơi, kiểm tra quyền thao tác theo trạng thái trận đấu và từ chối các yêu cầu không hợp lệ như bắn lại một ô, sử dụng kỹ năng chưa được mở khóa, gửi đáp án nhiều lần cho cùng một câu hỏi hoặc thao tác sau khi trận đấu kết thúc.

Các thay đổi trong trận đấu cần được đồng bộ theo thời gian thực. Nếu người chơi mất kết nối, hệ thống nên có quy tắc xử lý rõ ràng, chẳng hạn cho phép kết nối lại trong thời hạn nhất định và khôi phục trạng thái trận đấu từ máy chủ.

Lịch sử trận đấu cần lưu lại câu trả lời, thời điểm trả lời, kết quả phát bắn, trạng thái tàu, việc sử dụng kỹ năng và kết quả cuối cùng. Những dữ liệu này phục vụ việc tổng kết, kiểm tra lỗi và hạn chế gian lận.

## 8. Mục tiêu phát triển trò chơi

Hải Chiến Tri Thức hướng đến việc tạo ra một môi trường học tập có tính tương tác cao, nơi người chơi vừa kiểm tra kiến thức vừa vận dụng tư duy chiến thuật.

Trò chơi không chỉ đánh giá khả năng trả lời chính xác mà còn khuyến khích người chơi lập kế hoạch, dự đoán vị trí mục tiêu, quản lý kỹ năng và phối hợp với đồng đội.

Phiên bản đầu tiên nên tập trung hoàn thiện các chức năng cốt lõi gồm tạo phòng, tham gia trận đấu, tạo bản đồ, bố trí tàu ngẫu nhiên, phát câu hỏi, kiểm tra đáp án, thực hiện lượt bắn và xác định kết quả thắng thua.

Sau khi cơ chế cơ bản hoạt động ổn định, có thể triển khai lần lượt năm tính năng bổ sung là Radar dò tìm, Bắn chính xác, Lá chắn phòng thủ, Combo kiến thức và Bảng xếp hạng cá nhân.

Việc phát triển theo từng giai đoạn giúp hệ thống dễ kiểm thử, dễ cân bằng và thuận tiện mở rộng từ chế độ đấu tay đôi lên chế độ đội nhóm tối đa 50 người chơi.
