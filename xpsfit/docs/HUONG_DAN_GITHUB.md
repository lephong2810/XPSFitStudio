# XPS Fit Studio: đưa lên GitHub, cài như app, cách dùng

Thư mục `xpsfit/docs/` là một trang web tĩnh hoàn chỉnh. Mọi tính toán chạy ngay trong trình duyệt, không cần máy chủ. File phổ người dùng mở chỉ nằm trong trình duyệt của họ, không gửi đi đâu. Plotly.js, SheetJS và font đã được tải sẵn vào `vendor/` và `fonts/`, nên app chạy được khi không có Internet.

## Đưa lên GitHub lần đầu

1. Trên GitHub, tạo repo mới tên **`XPSFitStudio`** (Public), không cần tạo README.
2. Giải nén `XPSFitStudio.zip`. Trong repo mới, chọn **Add file → Upload files**, rồi kéo **toàn bộ nội dung** thư mục `XPSFitStudio/` vào. Phải gồm cả `index.html`, `README.md`, `LICENSE` và thư mục `xpsfit/` cùng các thư mục con của nó.
3. Bấm **Commit changes**.
4. Vào **Settings → Pages**. Ở mục *Build and deployment*, chọn *Source: Deploy from a branch*, *Branch: main*, thư mục */ (root)*, rồi bấm **Save**.
5. Đợi 1–2 phút. App sẽ có ở địa chỉ `https://lephong2810.github.io/XPSFitStudio/`. File `index.html` ở thư mục gốc tự chuyển vào `xpsfit/docs/`.

Nên điền thêm phần *About* của repo (biểu tượng bánh răng bên phải trang repo):
- **Website:** địa chỉ trang ở trên.
- **Topics:** `xps`, `peak-fitting`, `surface-analysis`, `materials-science`.

## Cập nhật

1. Sửa file trong `xpsfit/docs/`.
2. Chạy lệnh sau:
   ```bash
   python xpsfit/build_docs.py
   ```
   Lệnh này đánh số phiên bản mới vào `sw.js`, để máy đã cài app tự nhận bản cập nhật. Nếu không chạy, máy đã cài app có thể vẫn dùng bản cũ.
3. Push lên GitHub, hoặc dùng Upload files như lúc đầu (file trùng tên sẽ được ghi đè).

Nếu đổi số phiên bản phần mềm, sửa `VERSION` trong `core.js`, `version` trong `CITATION.cff` và các câu trích dẫn trong `README.md`.

## Thử trên máy trước khi đưa lên

Không mở `index.html` bằng cách nhấp đúp (dạng `file://`), vì trình duyệt sẽ không cho cài app và chạy offline. Thay vào đó, chạy lệnh:
```bash
cd XPSFitStudio
python -m http.server 8000
```
rồi mở `http://localhost:8000/xpsfit/docs/`.

Kiểm tra lõi tính toán (cần Node.js):
```bash
node xpsfit/tests/test_core.js
```

## Cài như một app

- **Chrome / Edge** (Windows, macOS, Linux): bấm nút **Cài app** trên thanh công cụ, hoặc biểu tượng cài đặt ở cuối thanh địa chỉ.
- **Safari trên macOS 14 trở lên:** menu **File → Add to Dock…**
- **iPad / iPhone:** nút Chia sẻ → **Thêm vào Màn hình chính**.

Sau lần mở đầu tiên có mạng, app chạy được cả khi không có Internet.

## Các thao tác chính

| Việc cần làm | Thao tác |
|---|---|
| Mở phổ | Nút **Mở phổ**, hoặc kéo thả file vào cột trái. Đọc được `.vms` (VAMAS), file văn bản xuất từ máy đo (cột KE/BE/cps, kể cả không có đuôi) và `.txt`/`.csv` hai cột |
| Đơn vị, thời gian thu | Tab **Dữ liệu & BE**: chọn counts / cps / a.u. và thời gian thu mỗi điểm (dwell × số lần quét). Cần đúng để χ² và định lượng có ý nghĩa |
| Hiệu chỉnh BE | Tab **Dữ liệu & BE**: nhập đỉnh đo được và giá trị chuẩn (C 1s = 284.8 eV) → **Tính độ dịch** → **Áp dụng cho mọi phổ** |
| Trừ nền | Tab **Nền**: vùng, kiểu nền (Shirley, Smart, Tougaard U2, tuyến tính), điểm neo. Kéo vòng tròn trên đồ thị để chỉnh mức nền |
| Thêm, khớp peak | Tab **Peak**: **+ Thêm peak** hoặc **+ Peak bằng cú bấm**; chọn dạng peak (GL tích, GL tổng, LA bất đối xứng), doublet, khoá thông số → **Khớp phổ** (Ctrl/⌘ Enter) |
| Tinh chỉnh bằng tay | Ở tab Peak: kéo chấm tròn ở đỉnh (BE, chiều cao) và thanh dọc (FWHM) |
| Định lượng | Tab **Định lượng**: chọn mức lõi hoặc nhập RSF của máy; xem % nguyên tử theo vùng và theo thành phần |
| Xuất kết quả | Tab **Kết quả**: chọn định dạng **SciPlot Studio** (`.sciplot.json`, mở bằng File → Mở project trong SciPlot để chỉnh hình), **Excel** (dữ liệu, thông số ± sai số, định lượng, Methods) hoặc **CSV**; chọn phổ đang chọn hay tất cả phổ. Nút PNG/SVG trên đồ thị xuất hình nhanh |
| Đoạn Methods | Tab **Kết quả**: đoạn tiếng Anh tự sinh, bấm **Sao chép đoạn Methods** |
| Lưu để làm tiếp | **Lưu project** (Ctrl/⌘ S) ra file `.xpsfit.json`; **Mở project** (Ctrl/⌘ O). Trình duyệt cũng tự lưu phiên gần nhất |
| Hoàn tác | Ctrl/⌘ Z, làm lại Ctrl/⌘ Y |
| Ngôn ngữ, giao diện | Nút **VI \| EN** và nút sáng / theo hệ thống / tối trên thanh công cụ |
