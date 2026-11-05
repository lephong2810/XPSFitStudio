/* XPS Fit Studio — interface language (Tiếng Việt / English). Dictionary: Vietnamese string → English. */
const I18N = (() => {
  let lang = (() => {
    try { const s = localStorage.getItem('xpsfit-lang'); if (s === 'vi' || s === 'en') return s; } catch (e) { }
    return /^vi\b/i.test(navigator.language || '') ? 'vi' : 'en';
  })();
  const EN = {
    // data & messages
    'Dữ liệu mẫu (mô phỏng)': 'Sample data (simulated)', 'Phổ mô phỏng có nhiễu Poisson': 'Simulated spectrum with Poisson noise',
    'Không còn gì để hoàn tác': 'Nothing to undo', 'Đã hoàn tác': 'Undone', 'Đã làm lại': 'Redone',
    'File không phải project XPS Fit Studio.': 'This file is not an XPS Fit Studio project.',
    'Đã mở project {0}': 'Opened project {0}', 'Đã đọc {0} phổ': 'Loaded {0} spectra', ' (có cảnh báo)': ' (with warnings)', '(có cảnh báo)': '(with warnings)',
    'Đã lưu {0}': 'Saved {0}', 'Không lưu được file: {0}': 'Could not save the file: {0}',
    'Đã có peak': 'Has peaks', 'Chưa có peak': 'No peaks yet', 'mẫu': 'sample', 'Xoá phổ này': 'Remove this spectrum',
    'Chưa có phổ. Mở file hoặc thêm dữ liệu mẫu.': 'No spectra yet. Open a file or add the sample data.', 'Chưa có phổ': 'No spectrum',
    'Chưa có điểm neo: nền tính một đoạn cho cả vùng.': 'No anchors: one background segment spans the whole region.',
    'Xoá điểm neo này': 'Remove this anchor', 'mức tay': 'manual level', '{0} điểm mút đang dùng mức tay': '{0} end point(s) use a manual level',
    'Tên peak': 'Peak name', 'Dạng peak': 'Line shape', 'GL tích': 'GL product', 'GL tổng': 'GL sum', 'LA bất đối xứng': 'LA asymmetric',
    'Đơn': 'Singlet', 'Mẫu sẵn': 'Presets', 'Xoá peak': 'Remove peak', 'Giữ cố định khi khớp': 'Keep fixed during the fit', 'khoá': 'fix',
    'Độ rộng L (eV)': 'Lorentz width (eV)', 'Chiều cao': 'Height', '(đuôi BE cao)': '(high-BE tail)', '(phía BE thấp)': '(low-BE side)', 'Gauss (eV)': 'Gaussian (eV)',
    'Tỉ lệ diện tích': 'Area ratio',
    'Chưa có peak. Bấm "+ Thêm peak" hoặc bật "+ Peak bằng cú bấm" rồi bấm lên đỉnh phổ.': 'No peaks yet. Press "+ Add peak", or turn on "+ Peak by click" and click a peak on the spectrum.',
    'Dữ liệu': 'Data', 'Nền': 'Background', 'Tổng (envelope)': 'Envelope', 'Phần dư': 'Residual', 'Dư': 'Res.',
    'Thêm peak và bấm "Khớp phổ" để có χ², sai số và diện tích.': 'Add peaks and press "Fit" to get χ², uncertainties and areas.',
    'rút gọn': 'reduced', 'Dạng': 'Shape', 'FWHM đo (eV)': 'Measured FWHM (eV)', 'Diện tích': 'Area',
    'Sai số sẽ hiện sau khi bấm "Khớp phổ" (thông số đã đổi sau lần khớp gần nhất).': 'Uncertainties appear after you press "Fit" (parameters changed since the last fit).',
    'Chưa có phổ nào được khớp.': 'No spectrum has been fitted yet.',
    'Vùng': 'Region', 'Mức lõi (RSF)': 'Core level (RSF)', 'Diện tích (cps·eV)': 'Area (cps·eV)', 'Tự động': 'Auto', 'Tự nhập': 'Custom',
    'Có vùng ở đơn vị a.u.: chỉ so sánh được khi mọi vùng đo cùng điều kiện.': 'Some regions are in a.u.: they are comparable only if all regions were measured under the same conditions.',
    'Có vùng ở đơn vị counts nhưng chưa có thời gian thu; diện tích chưa quy về cps.': 'Some regions are in counts without an acquisition time, so their areas are not converted to cps.',
    'Vùng chưa có peak dùng tích phân dữ liệu sau trừ nền.': 'Regions without peaks use the integral of the background-subtracted data.',
    'Có vùng chưa có RSF; hãy chọn mức lõi hoặc tự nhập.': 'Some regions have no RSF; choose a core level or enter a value.',
    'Cần ít nhất hai vùng để tính % nguyên tử.': 'At least two regions are needed for atomic percentages.',
    'Thành phần': 'Component', '% trong vùng': '% of region',
    'Đã dùng độ dịch {0} eV cho {1} phổ': 'Applied a {0} eV shift to {1} spectra', 'Nhập vị trí đỉnh đo được và giá trị chuẩn': 'Enter the measured peak position and the reference value',
    'Độ dịch = {0} eV': 'Shift = {0} eV', 'Phổ này chưa có peak': 'This spectrum has no peaks', 'Chọn vùng phân tích trước': 'Set the analysis region first',
    'Đã khớp sau {0} vòng lặp ({1} ms). χ² rút gọn = {2}': 'Fitted in {0} iterations ({1} ms). Reduced χ² = {2}',
    ' — chưa hội tụ hẳn, bấm Khớp lại.': ' — not fully converged, press Fit again.',
    'Mức nền đã về trung bình dữ liệu': 'Background levels reset to the data average', 'Điểm neo phải nằm trong vùng phân tích': 'Anchors must lie inside the analysis region',
    'Bấm lên phổ tại thung lũng giữa các peak để đặt điểm neo nền. Bấm lại nút để tắt.': 'Click the spectrum at a valley between peaks to place a background anchor. Press the button again to stop.',
    'Bấm vào một điểm trên phổ để đặt peak tại BE đó. Bấm lại nút để tắt.': 'Click a point on the spectrum to place a peak at that BE. Press the button again to stop.',
    'Kéo ngang trên đồ thị để chọn vùng phân tích.': 'Drag horizontally on the plot to set the analysis region.',
    'Kéo các vòng tròn (điểm neo, hai điểm mút) để chỉnh nền. Peak không bị ảnh hưởng.': 'Drag the circles (anchors and both end points) to adjust the background. Peaks are not affected.',
    'Kéo chấm tròn ở đỉnh peak để dời BE và đổi chiều cao; kéo thanh dọc ở nửa chiều cao để đổi FWHM. Nền giữ nguyên.': 'Drag the dot at a peak top to move its BE and height; drag the bar at half height to change the FWHM. The background stays fixed.',
    'Tay kéo peak đang ẩn.': 'Peak handles are hidden.',
    'Trục BE đảo chiều như quy ước XPS. Phía dưới là phần dư của phép khớp.': 'The BE axis is reversed, as usual in XPS. The lower panel shows the fit residual.',
    'Đã chỉnh peak bằng tay. Bấm "Khớp phổ" nếu muốn tối ưu tiếp từ vị trí này.': 'Peak adjusted by hand. Press "Fit" to refine from here.',
    'Thư viện Excel chưa tải xong, thử lại sau giây lát': 'The Excel library is still loading; try again in a moment',
    'Trình duyệt chặn sao chép': 'The browser blocked copying',
    'Đã sao chép {0} dòng. Dán vào bảng tính hoặc phần mềm vẽ đồ thị.': 'Copied {0} rows. Paste them into a spreadsheet or plotting software.',
    'Đã sao chép đoạn Methods': 'Methods text copied', 'Không xuất được hình: {0}': 'Could not export the figure: {0}', 'Sao chép': 'Copy', 'Đã sao chép': 'Copied',
    'O lưới (M–O)': 'Lattice O (M–O)', 'OH / O hấp phụ': 'OH / adsorbed O', 'H₂O hấp phụ': 'Adsorbed H₂O', 'Vệ tinh 1': 'Satellite 1', 'Vệ tinh 2': 'Satellite 2', 'Vệ tinh 2p₁/₂': '2p₁/₂ satellite',
    'Lời cảm ơn (Acknowledgments)': 'Acknowledgments', 'Phần Methods / Experimental': 'Methods / Experimental', 'Chú thích hình / SI': 'Figure caption / SI', 'Tài liệu tham khảo (kiểu ACS)': 'Reference (ACS style)',
    // engine
    'Dán số liệu từ Excel hoặc file khác': 'Paste data from Excel or another file', 'Dán số liệu': 'Paste data', 'Dán số liệu từ bảng tính': 'Paste data from a spreadsheet',
    'VAMAS (.vms), Excel (.xlsx), file văn bản xuất từ máy đo (kể cả không có đuôi), .txt / .csv. Kéo thả được nhiều file.': 'VAMAS (.vms), Excel (.xlsx), text exports from the instrument (with or without an extension), .txt / .csv. Drop several files at once.',
    'Chép các ô trong Excel hoặc file khác (Ctrl/⌘ C) rồi dán vào ô dưới đây (Ctrl/⌘ V). Số liệu xếp theo cột hay theo hàng đều được; có thể dán cả dòng tiêu đề.': 'Copy the cells in Excel or another file (Ctrl/⌘ C) and paste them below (Ctrl/⌘ V). Data in columns or in rows both work, and a header row may be included.',
    'Dán vào đây, ví dụ:\nBinding energy (eV)\tIntensity\n295.0\t3120\n294.9\t3135': 'Paste here, for example:\nBinding energy (eV)\tIntensity\n295.0\t3120\n294.9\t3135',
    'Mở file Excel / CSV vào bảng': 'Load an Excel / CSV file into the table', 'Đổi hàng ↔ cột': 'Swap rows ↔ columns', 'Xoá': 'Clear',
    'Tự nhận theo tiêu đề': 'Detect from the header', 'Huỷ': 'Cancel', 'Thêm vào danh sách phổ': 'Add to spectra', 'Thêm {0} phổ vào danh sách': 'Add {0} spectra',
    'Dán từ bảng tính': 'Pasted from a spreadsheet', 'Không đọc được số liệu.': 'No numeric data found.', '{0} cột × {1} dòng': '{0} columns × {1} rows',
    'đã đổi hàng thành cột': 'rows turned into columns', 'Cường độ': 'Intensity', 'Bỏ qua': 'Skip', '… và {0} dòng nữa': '… and {0} more rows',
    'BE = {0} − KE': 'BE = {0} − KE', 'số liệu theo hàng (đã đổi sang cột)': 'data in rows (converted to columns)', 'Bố cục': 'Layout',
    'File VAMAS bị cắt ngang ở dòng {0}': 'The VAMAS file ends unexpectedly at line {0}', 'Dòng {0} không phải số: "{1}"': 'Line {0} is not a number: "{1}"',
    'Không phải file VAMAS (dòng đầu: "{0}")': 'Not a VAMAS file (first line: "{0}")', 'File dùng danh sách loại trừ tham số; có thể đọc không chính xác.': 'The file uses a parameter exclusion list and may not be read correctly.',
    'Chỉ hỗ trợ VAMAS kiểu quét REGULAR (khối "{0}" là {1}).': 'Only REGULAR-scan VAMAS files are supported (block "{0}" is {1}).', 'Khối {0}': 'Block {0}',
    'BE = 1486.6 − KE (giả định Al Kα)': 'BE = 1486.6 − KE (Al Kα assumed)', '{0}: không có cột BE, đã tính từ KE với Al Kα.': '{0}: no BE column; BE was computed from KE assuming Al Kα.',
    'cột {0}': 'column {0}', 'Không tìm thấy cột số (Binding Energy, Intensity) trong file.': 'No numeric columns (binding energy, intensity) were found in the file.',
    'Vùng phân tích quá hẹp.': 'The analysis region is too narrow.', 'Chưa có peak nào để khớp.': 'There are no peaks to fit.',
    'Khối': 'Block', 'Mẫu': 'Sample', 'Thiết bị': 'Instrument', 'Cơ sở': 'Institution', 'Nguồn': 'Source', 'Chế độ': 'Analyser mode', 'Trục gốc': 'Original axis', 'Bước': 'Step', 'Ghi chú': 'Note', 'Cột dùng': 'Columns used',
    // static page
    'Tệp': 'File', 'Mở file phổ (.vms, .txt, .csv)': 'Open spectrum files (.vms, .txt, .csv)', 'Mở phổ': 'Open spectra', 'Lưu project (Ctrl/⌘ S)': 'Save project (Ctrl/⌘ S)', 'Lưu project': 'Save project',
    'Mở project (.xpsfit.json)': 'Open project (.xpsfit.json)', 'Mở project': 'Open project', 'Hoàn tác (Ctrl/⌘ Z)': 'Undo (Ctrl/⌘ Z)', 'Làm lại (Ctrl/⌘ Y)': 'Redo (Ctrl/⌘ Y)',
    'Ứng dụng': 'App', 'Cài XPS Fit Studio như một ứng dụng': 'Install XPS Fit Studio as an app', 'Cài app': 'Install app', 'Hướng dẫn, phím tắt, trích dẫn': 'Guide, shortcuts, citation', 'Trợ giúp': 'Help',
    'Ủng hộ và trích dẫn': 'Support & cite', 'Trích dẫn': 'Cite', 'Ngôn ngữ': 'Language', 'Giao diện': 'Theme', 'Sáng': 'Light', 'Theo hệ thống': 'System', 'Tối': 'Dark',
    'Phổ': 'Spectra', 'Mở file phổ': 'Open spectrum files',
    'VAMAS (.vms), file văn bản xuất từ máy đo (kể cả không có đuôi), .txt / .csv hai cột. Kéo thả được nhiều file.': 'VAMAS (.vms), text exports from the instrument (with or without an extension), two-column .txt / .csv. Drop several files at once.',
    '+ Thêm dữ liệu mẫu': '+ Add sample data', 'Thông tin phổ': 'Spectrum info', 'Đồ thị': 'Plot',
    'Kéo ngang trên đồ thị để chọn vùng phân tích': 'Drag horizontally on the plot to set the analysis region', 'Chọn vùng': 'Select region',
    'Bấm lên phổ để đặt điểm neo nền': 'Click the spectrum to place a background anchor', '+ Điểm neo': '+ Anchor',
    'Bấm lên đồ thị để thêm peak tại vị trí đó': 'Click the plot to add a peak there', '+ Peak bằng cú bấm': '+ Peak by click',
    'Hiện hoặc ẩn tay kéo trên từng peak': 'Show or hide the drag handles on each peak', 'Tay kéo peak': 'Peak handles',
    'Xuất hình PNG 600 dpi, nền trắng': 'Export a 600 dpi PNG on white', 'Xuất hình vector SVG': 'Export a vector SVG',
    'Công cụ': 'Tools', 'Chức năng': 'Functions', 'Dữ liệu & BE': 'Data & BE', 'Định lượng': 'Quantify', 'Kết quả': 'Results',
    'Phổ đang chọn': 'Selected spectrum', 'Tên phổ (mức lõi)': 'Spectrum name (core level)', 'Đơn vị cường độ': 'Intensity unit',
    'counts (số đếm)': 'counts', 'a.u. (không rõ)': 'a.u. (unknown)', 'Thời gian thu mỗi điểm (s)': 'Acquisition time per point (s)',
    'Thời gian thu = dwell × số lần quét. Dùng để tính χ² theo thống kê Poisson và quy về cps khi định lượng.': 'Acquisition time = dwell × number of scans. It is used for Poisson-weighted χ² and to convert areas to cps for quantification.',
    'Hiệu chỉnh năng lượng liên kết': 'Binding-energy calibration', 'Dịch BE (eV)': 'BE shift (eV)', 'Áp dụng cho mọi phổ': 'Apply to all spectra', 'Mức chuẩn': 'Reference line',
    'Đỉnh đo được (eV)': 'Measured peak (eV)', 'Giá trị chuẩn (eV)': 'Reference value (eV)', 'Lấy từ peak 1': 'Use peak 1', 'Tính độ dịch': 'Compute shift',
    'Độ dịch = chuẩn − đo được. Thường dùng C 1s của carbon bám bẩn = 284.8 eV; nên ghi rõ mốc này trong bài báo.': 'Shift = reference − measured. Adventitious carbon C 1s = 284.8 eV is common; state the reference in your paper.',
    'BE thấp (eV)': 'Low BE (eV)', 'BE cao (eV)': 'High BE (eV)', 'Kiểu nền': 'Background', 'Smart (Shirley ≤ dữ liệu)': 'Smart (Shirley ≤ data)', 'Tuyến tính': 'Linear', 'Không trừ nền': 'None',
    'Số điểm trung bình ở mút': 'End-point averaging (points)', 'Điểm neo nền': 'Background anchors', 'Đặt điểm neo': 'Place anchors', 'Mức nền tự động': 'Auto levels', 'Xoá điểm neo': 'Clear anchors',
    'Kéo các vòng tròn trên đồ thị: lên/xuống đổi mức nền, kéo điểm mút sang ngang đổi vùng. Vòng tô đặc là mức đặt tay. Với Cu 2p, Ni 2p, Co 2p, đặt một điểm neo ở thung lũng giữa vệ tinh của 2p3/2 và peak 2p1/2.': 'Drag the circles on the plot: up/down changes the background level, dragging an end point sideways changes the region. Filled circles are manual levels. For Cu 2p, Ni 2p and Co 2p, place one anchor in the valley between the 2p3/2 satellites and the 2p1/2 peak.',
    'Chọn kiểu nền nào?': 'Which background?',
    'Shirley: nền tại mỗi điểm tỉ lệ với diện tích peak phía BE thấp hơn, lặp đến khi hội tụ; dùng phổ biến nhất. Smart: Shirley không cho nền vượt dữ liệu đã làm trơn. Tougaard U2: theo tiết diện tán xạ không đàn hồi phổ quát, cần vùng rộng (30–50 eV phía BE cao). Tuyến tính: cho peak hẹp, nền phẳng.': 'Shirley: the background at each point is proportional to the peak area at lower BE, iterated to convergence; the most common choice. Smart: Shirley kept at or below the smoothed data. Tougaard U2: universal inelastic cross-section; needs a wide region (30–50 eV on the high-BE side). Linear: for narrow peaks on a flat background.',
    '+ Thêm peak': '+ Add peak', 'Khớp phổ': 'Fit', 'Xoá hết': 'Clear all', 'Dùng chung FWHM': 'Shared FWHM', 'Dạng peak mặc định': 'Default line shape',
    'GL dạng tích': 'GL product', 'GL dạng tổng (pseudo-Voigt)': 'GL sum (pseudo-Voigt)', 'LA bất đối xứng (kim loại)': 'LA asymmetric (metals)', 'Về dạng peak': 'About line shapes',
    'GL dạng tích: exp(−4 ln2 (1−m) t²) / (1 + 4 m t²), ký hiệu GL(100m); GL(30) là lựa chọn thường gặp. GL dạng tổng: (1−m)·Gauss + m·Lorentz. LA(α, β, G): Lorentz bất đối xứng mũ α phía BE cao, β phía BE thấp, chập với Gauss có FWHM G; dùng cho mức lõi kim loại (Cu⁰, Ni⁰, Pt⁰, Pd⁰) và carbon sp². α nhỏ thì đuôi dài. Cột "FWHM" là tham số độ rộng; FWHM đo thực trên đường peak nằm ở tab Kết quả.': 'GL product: exp(−4 ln2 (1−m) t²) / (1 + 4 m t²), written GL(100m); GL(30) is a common choice. GL sum: (1−m)·Gaussian + m·Lorentzian. LA(α, β, G): asymmetric Lorentzian with exponent α on the high-BE side and β on the low-BE side, convolved with a Gaussian of FWHM G; for metallic core levels (Cu⁰, Ni⁰, Pt⁰, Pd⁰) and sp² carbon. A smaller α gives a longer tail. The "FWHM" field is the width parameter; the FWHM measured on the actual profile is in the Results tab.',
    'Hiệu chỉnh IMFP': 'IMFP correction', 'Không (chỉ chia RSF)': 'None (RSF only)', 'Nguồn RSF (ghi vào Methods)': 'RSF source (for the Methods text)',
    '% nguyên tử = (I/RSF) / Σ(I/RSF), với I là diện tích sau trừ nền tính theo cps. RSF có sẵn là tiết diện Scofield (Al Kα, C 1s = 1), chỉ để tham khảo. Hãy dùng RSF trong thư viện của máy đo, vì RSF phụ thuộc hàm truyền và hình học của từng máy.': 'Atomic % = (I/RSF) / Σ(I/RSF), where I is the background-subtracted area in cps. Built-in RSFs are Scofield cross-sections (Al Kα, C 1s = 1) for reference only. Use the sensitivity-factor library of your instrument, since RSFs depend on its transmission function and geometry.',
    'Đoạn Methods (tiếng Anh) cho bài báo': 'Methods text for your paper', 'Sao chép đoạn Methods': 'Copy Methods text', 'Gồm mọi phổ đã khớp': 'Include all fitted spectra',
    'Cách tính χ² và sai số': 'How χ² and uncertainties are computed',
    'χ² = Σ (y_đo − y_khớp)² / σ², σ² = số đếm (Poisson), trên mọi điểm trong vùng phân tích; χ² rút gọn = χ² / (N − p). Giá trị gần 1 nghĩa là phần dư cỡ nhiễu thống kê; 1–2 là tốt, 2–5 chấp nhận được với phổ phức tạp. Sai số (±1σ) lấy từ ma trận hiệp phương sai (JᵀWJ)⁻¹ nhân χ² rút gọn; nền giữ cố định nên sai số không gồm ảnh hưởng của cách chọn nền. Sai số chỉ hiện khi thông số chưa bị chỉnh sau lần khớp gần nhất.': 'χ² = Σ (y_obs − y_fit)² / σ² with σ² = counts (Poisson), over all points in the analysis region; reduced χ² = χ² / (N − p). Values near 1 mean the residual is at the level of counting noise; 1–2 is good, 2–5 is acceptable for complex spectra. Uncertainties (±1σ) come from the covariance matrix (JᵀWJ)⁻¹ scaled by the reduced χ²; the background is held fixed, so they exclude the effect of the background choice. They are shown only while the parameters are unchanged since the last fit.',
    'Hướng dẫn nhanh': 'Quick guide', 'Đóng': 'Close', 'Quy trình': 'Workflow',
    'Mở file phổ (.vms hoặc file văn bản xuất từ máy đo) bằng nút Mở phổ hoặc kéo thả vào cột bên trái.': 'Open spectrum files (.vms or text exports from the instrument) with Open spectra, or drop them on the left column.',
    'Tab Dữ liệu & BE: kiểm tra đơn vị cường độ, hiệu chỉnh BE theo C 1s, rồi bấm Áp dụng cho mọi phổ.': 'Data & BE tab: check the intensity unit, calibrate BE to C 1s, then press Apply to all spectra.',
    'Tab Nền: chọn vùng, kiểu nền, đặt và kéo điểm neo khi cần.': 'Background tab: set the region and background type; place and drag anchors where needed.',
    'Tab Peak: thêm peak (nút hoặc bấm lên phổ), chọn dạng peak, doublet, khoá thông số, rồi bấm Khớp phổ. Kéo tay kéo trên đồ thị để tinh chỉnh.': 'Peak tab: add peaks (button or click on the spectrum), choose line shapes, doublets and fixed parameters, then press Fit. Drag the handles on the plot to fine-tune.',
    'Tab Định lượng: chọn RSF cho từng vùng để có % nguyên tử.': 'Quantify tab: choose an RSF for each region to get atomic percentages.',
    'Tab Kết quả: xem χ², sai số, xuất Excel, xuất hình và chép đoạn Methods.': 'Results tab: check χ² and uncertainties, export Excel and figures, and copy the Methods text.',
    'Phím tắt': 'Shortcuts', 'Hoàn tác · làm lại': 'Undo · redo', 'Lưu · mở project (.xpsfit.json)': 'Save · open project (.xpsfit.json)', 'Chuyển tab': 'Switch tabs',
    'Dữ liệu của bạn': 'Your data',
    'Mọi tính toán chạy ngay trong trình duyệt. File phổ không được tải lên đâu cả. Phiên làm việc gần nhất được lưu tạm trong trình duyệt; dùng Lưu project để giữ lâu dài.': 'All processing runs in your browser. Spectrum files are never uploaded. The latest session is kept in the browser; use Save project to keep your work.',
    'Giới thiệu': 'About',
    'Phát triển bởi TS. Lê Hoài Phong, Khoa Hóa học, Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM. Phát hành theo giấy phép MIT. Dùng Plotly.js (MIT) và SheetJS Community Edition (Apache-2.0). XPS Fit Studio là dự án độc lập, không liên kết với hãng thiết bị hay phần mềm nào; mọi nhãn hiệu thuộc về chủ sở hữu.': 'Developed by Dr. Phong Hoai Le, Faculty of Chemistry, University of Science, VNU-HCM. Released under the MIT License. Uses Plotly.js (MIT) and SheetJS Community Edition (Apache-2.0). XPS Fit Studio is an independent project and is not affiliated with any instrument or software vendor; all trademarks belong to their owners.',
    'XPS Fit Studio miễn phí cho mọi người. Nếu phần mềm có ích, xin hãy:': 'XPS Fit Studio is free for everyone. If you find it useful, please:',
    'Gắn ⭐ cho repo trên GitHub để nhiều nhà nghiên cứu biết đến công cụ.': 'Star ⭐ the repository on GitHub so other researchers can find it.',
    'Ghi nhận XPS Fit Studio trong bài báo, luận văn và báo cáo bằng một trong các câu dưới đây.': 'Acknowledge XPS Fit Studio in your papers, theses and reports with one of the sentences below.',
    '⭐ Star trên GitHub': '⭐ Star on GitHub',
    'Xuất kết quả': 'Export', 'Định dạng': 'Format', 'Tất cả phổ': 'All spectra', 'Xuất file': 'Export file',
    'Sao chép bảng dữ liệu': 'Copy data table', 'Mở SciPlot Studio ↗': 'Open SciPlot Studio ↗',
    'File project mở thẳng trong SciPlot Studio (File → Mở project): mỗi phổ thành một hình XPS có tô peak kèm workbook số liệu, chỉnh được font, màu, trục và ghép hình (a)(b)(c).': 'A project file that opens directly in SciPlot Studio (File → Open project): each spectrum becomes an XPS graph with filled peaks plus its data workbook, so you can restyle fonts, colours and axes and combine panels (a)(b)(c).',
    'Mỗi phổ hai sheet: dữ liệu để vẽ lại (BE, dữ liệu đo, nền, từng peak cộng nền, đường tổng, phần dư) và thông số khớp ± sai số; kèm sheet định lượng và Methods khi xuất tất cả.': 'Two sheets per spectrum: data for re-plotting (BE, raw, background, each peak plus background, envelope, residual) and fit parameters ± uncertainties; quantification and Methods sheets are added when exporting all spectra.',
    'Mỗi phổ một file CSV: BE, dữ liệu đo, nền, dữ liệu trừ nền, đường tổng, từng peak cộng nền, phần dư. Mở được bằng mọi phần mềm bảng tính và vẽ đồ thị.': 'One CSV file per spectrum: BE, raw, background, background-subtracted data, envelope, each peak plus background, residual. Opens in any spreadsheet or plotting software.'
  };
  const listeners = [];
  function t(s, ...a) {
    let r = lang === 'en' ? (EN[s] ?? s) : s;
    return a.length ? r.replace(/\{(\d+)\}/g, (_, i) => a[+i] ?? '') : r;
  }
  const origText = new WeakMap();
  const ATTRS = ['title', 'placeholder', 'aria-label'];
  function translateDom(root) {
    root = root || document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.parentElement && !n.parentElement.closest('[data-dyn], script, style') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    let n;
    while ((n = walker.nextNode())) {
      if (!origText.has(n)) origText.set(n, n.nodeValue);
      const o = origText.get(n), k = o.trim();
      if (!k) continue;
      const tr = lang === 'en' ? EN[k] : null;
      n.nodeValue = tr ? o.replace(k, tr) : o;
    }
    root.querySelectorAll('*').forEach(el => {
      if (el.closest('[data-dyn]')) return;
      ATTRS.forEach(a => {
        if (!el.hasAttribute(a)) return;
        const key = 'i18n' + a.replace(/-./g, m => m[1].toUpperCase()).replace(/^./, c => c.toUpperCase());
        if (!(key in el.dataset)) el.dataset[key] = el.getAttribute(a);
        const o = el.dataset[key];
        el.setAttribute(a, lang === 'en' ? (EN[o] ?? o) : o);
      });
    });
  }
  function setLang(l) {
    if (l !== 'vi' && l !== 'en') return;
    lang = l; document.documentElement.lang = l;
    try { localStorage.setItem('xpsfit-lang', l); } catch (e) { }
    translateDom(); listeners.forEach(f => f());
  }
  document.documentElement.lang = lang;
  return { t, setLang, translateDom, onChange: f => listeners.push(f), get lang() { return lang; }, EN };
})();
if (typeof module !== 'undefined') module.exports = I18N;
