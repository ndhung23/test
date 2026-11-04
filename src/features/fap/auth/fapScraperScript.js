// src/features/fap/fapScraperScript.js
// Kịch bản bóc tách thông minh chạy trực tiếp trong DOM thật của FAP (fap.fpt.edu.vn)
// Hỗ trợ:
// 1. Lịch thi (/ExamSchedule)
// 2. Thời khóa biểu tuần (/WeeklyTimetable - Tự động tải 17 tuần cả kỳ)

export const FAP_SCRAPER_INJECTED_JS = `
(function() {
  function cleanFapText(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw
      .replace(/<style[^>]*>[\\s\\S]*?<\\/style>/gi, '')
      .replace(/<script[^>]*>[\\s\\S]*?<\\/script>/gi, '')
      .replace(/<\\/tr>/gi, '\\n')
      .replace(/<\\/td>/gi, '\\t')
      .replace(/<\\/th>/gi, '\\t')
      .replace(/<\\/div>/gi, '\\n')
      .replace(/<\\/p>/gi, '\\n')
      .replace(/<br\\s*[\\/]?>/gi, '\\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&');
  }

  function parseSubject(subRaw) {
    if (!subRaw) return { code: 'MÔN THI', name: 'Môn thi FPT' };
    var clean = subRaw.replace(/^(MÔN\\s*THI|MÔN|SUBJECT)[:\\s]*/i, '').trim();
    var parts = clean.split(/\\s*[-–]\\s*/);
    var code = parts[0].trim().toUpperCase();
    var name = parts.slice(1).join(' - ').trim() || clean;
    return { code: code, name: name };
  }

  // 1. Bóc tách Lịch thi từ https://fap.fpt.edu.vn/ExamSchedule
  function parseExamsFromHtmlOrDOM(rootEl) {
    var results = [];
    var tables = Array.from((rootEl || document).querySelectorAll('table'));

    for (var t = 0; t < tables.length; t++) {
      var table = tables[t];
      var rows = Array.from(table.querySelectorAll('tbody tr'));
      if (rows.length === 0) rows = Array.from(table.querySelectorAll('tr'));

      for (var i = 0; i < rows.length; i++) {
        var cells = Array.from(rows[i].querySelectorAll('td'));
        if (cells.length < 4) continue;

        var rowText = cells.map(function(c) {
          return (c.innerText || c.textContent || '').trim();
        });

        var dateIdx = -1;
        var timeIdx = -1;
        for (var j = 0; j < rowText.length; j++) {
          if (/\\d{2}\\/\\d{2}\\/\\d{4}/.test(rowText[j]) && dateIdx === -1) dateIdx = j;
          if (/\\d{1,2}[h:]\\d{2}\\s*[-–]\\s*\\d{1,2}[h:]\\d{2}/i.test(rowText[j]) && timeIdx === -1) timeIdx = j;
        }

        if (dateIdx !== -1 && timeIdx !== -1) {
          var dateVal = rowText[dateIdx];
          var timeVal = rowText[timeIdx].replace(/\\s+/g, '');
          var roomVal = rowText[timeIdx + 1] || '-';
          var subVal = rowText[timeIdx + 2] || '';
          var sInfo = parseSubject(subVal);
          var formatVal = rowText[timeIdx + 3] || 'Practical_Exam';
          var typeVal = rowText[timeIdx + 4] || 'PE';
          var pubM = (rowText[timeIdx + 5] || '').match(/\\d{2}\\/\\d{2}\\/\\d{4}/);
          var pubVal = pubM ? pubM[0] : '';

          results.push({
            id: 'fap_exam_' + sInfo.code + '_' + dateVal.replace(/\\D/g, '') + '_' + timeVal.replace(/\\D/g, '').slice(0, 4) + '_' + results.length,
            date: dateVal,
            time: timeVal,
            room: roomVal,
            subjectCode: sInfo.code,
            subjectName: sInfo.name,
            examForm: formatVal,
            examType: typeVal,
            publishDate: pubVal,
            note: '',
            reminderEnabled: true,
            customReminderMinutes: null,
            notified: false
          });
        }
      }
    }

    if (results.length > 0) return results;

    // Quét dạng Thẻ Card Mobile FAP nếu không có table thông thường
    var text = cleanFapText(document.documentElement ? document.documentElement.outerHTML : '');
    var lines = text.split(/\\r?\\n/).map(function(l) { return l.trim(); }).filter(Boolean);
    var currentCard = null;
    var currentLabel = null;

    for (var k = 0; k < lines.length; k++) {
      var lk = lines[k];
      var uk = lk.toUpperCase();

      if (/^(DATE|NGÀY)$/i.test(lk) || uk.indexOf('DATE:') === 0 || uk.indexOf('NGÀY:') === 0) {
        if (currentCard && currentCard.date && (currentCard.subjectCode || currentCard.time)) {
          results.push(currentCard);
        }
        currentCard = {
          date: '',
          time: '',
          room: '',
          subjectCode: '',
          subjectName: '',
          examForm: 'Practical_Exam',
          examType: 'PE',
          publishDate: '',
          note: '',
          reminderEnabled: true,
          customReminderMinutes: null,
          notified: false
        };
        currentLabel = 'date';
        var inDate = lk.replace(/^(DATE|NGÀY)[:\\s]*/i, '').trim();
        if (inDate && /\\d{2}\\/\\d{2}\\/\\d{4}/.test(inDate)) currentCard.date = inDate;
        continue;
      }

      if (currentCard) {
        if (/^(TIME|THỜI GIAN|GIỜ)$/i.test(lk) || uk.indexOf('TIME:') === 0 || uk.indexOf('THỜI GIAN:') === 0) {
          currentLabel = 'time';
          var inTime = lk.replace(/^(TIME|THỜI GIAN|GIỜ)[:\\s]*/i, '').trim();
          if (inTime && /\\d{1,2}[h:]\\d{2}/i.test(inTime)) currentCard.time = inTime.replace(/\\s+/g, '');
        } else if (/^(ROOM|PHÒNG|PHÒNG THI)$/i.test(lk) || uk.indexOf('ROOM:') === 0 || uk.indexOf('PHÒNG:') === 0) {
          currentLabel = 'room';
          var inRoom = lk.replace(/^(ROOM|PHÒNG|PHÒNG THI)[:\\s]*/i, '').trim();
          if (inRoom) currentCard.room = inRoom;
        } else if (/^(MÔN\\s*THI|MÔN|SUBJECT)$/i.test(lk) || uk.indexOf('MÔN THI:') === 0 || uk.indexOf('MÔN:') === 0 || uk.indexOf('SUBJECT:') === 0) {
          currentLabel = 'subject';
          var inSub = lk.replace(/^(MÔN\\s*THI|MÔN|SUBJECT)[:\\s]*/i, '').trim();
          if (inSub && inSub !== lk) {
            var subObj = parseSubject(inSub);
            currentCard.subjectCode = subObj.code;
            currentCard.subjectName = subObj.name;
          }
        } else if (/^(HÌNH\\s*THỨC\\s*THI|HÌNH\\s*THỨC|EXAM\\s*FORMAT)$/i.test(lk) || uk.indexOf('HÌNH THỨC:') === 0 || uk.indexOf('EXAM FORMAT:') === 0) {
          currentLabel = 'format';
          var inFmt = lk.replace(/^(HÌNH\\s*THỨC\\s*THI|HÌNH\\s*THỨC|EXAM\\s*FORMAT)[:\\s]*/i, '').trim();
          if (inFmt && inFmt !== lk) currentCard.examForm = inFmt;
        } else if (/^(LOẠI\\s*THI|EXAM\\s*TYPE)$/i.test(lk) || uk.indexOf('LOẠI THI:') === 0 || uk.indexOf('EXAM TYPE:') === 0) {
          currentLabel = 'type';
          var inType = lk.replace(/^(LOẠI\\s*THI|EXAM\\s*TYPE)[:\\s]*/i, '').trim();
          if (inType && inType !== lk) currentCard.examType = inType;
        } else if (/^(NGÀY\\s*CÔNG\\s*BỐ\\s*ĐIỂM|NGÀY\\s*CÔNG\\s*BỐ)$/i.test(lk) || uk.indexOf('NGÀY CÔNG BỐ:') === 0) {
          currentLabel = 'publishDate';
          var inPub = lk.replace(/^(NGÀY\\s*CÔNG\\s*BỐ\\s*ĐIỂM|NGÀY\\s*CÔNG\\s*BỐ)[:\\s]*/i, '').trim();
          if (inPub && /\\d{2}\\/\\d{2}\\/\\d{4}/.test(inPub)) currentCard.publishDate = inPub;
        } else {
          if (currentLabel === 'date' && !currentCard.date) {
            var dm = lk.match(/\\d{2}\\/\\d{2}\\/\\d{4}/);
            if (dm) currentCard.date = dm[0];
          } else if (currentLabel === 'time' && !currentCard.time) {
            var tm = lk.match(/\\d{1,2}[h:]\\d{2}\\s*[-–]\\s*\\d{1,2}[h:]\\d{2}/i);
            if (tm) currentCard.time = tm[0].replace(/\\s+/g, '');
          } else if (currentLabel === 'room' && !currentCard.room) {
            currentCard.room = lk;
          } else if (currentLabel === 'subject' && !currentCard.subjectCode) {
            var subO = parseSubject(lk);
            currentCard.subjectCode = subO.code;
            currentCard.subjectName = subO.name;
          } else if (currentLabel === 'format' && !currentCard.examForm) {
            currentCard.examForm = lk;
          } else if (currentLabel === 'type' && !currentCard.examType) {
            currentCard.examType = lk;
          } else if (currentLabel === 'publishDate' && !currentCard.publishDate) {
            var pm = lk.match(/\\d{2}\\/\\d{2}\\/\\d{4}/);
            if (pm) currentCard.publishDate = pm[0];
          }
        }
      }
    }

    if (currentCard && currentCard.date && (currentCard.subjectCode || currentCard.time)) {
      results.push(currentCard);
    }

    return results.map(function(item, idx) {
      return {
        id: 'fap_card_' + (item.subjectCode || 'sub') + '_' + (item.date ? item.date.replace(/\\D/g, '') : 'd') + '_' + idx,
        date: item.date,
        time: item.time,
        room: item.room || 'DE-422',
        subjectCode: item.subjectCode || 'MÔN THI',
        subjectName: item.subjectName || item.subjectCode,
        examForm: item.examForm || 'Practical_Exam',
        examType: item.examType || 'PE',
        publishDate: item.publishDate || '',
        note: item.note || '',
        reminderEnabled: true,
        customReminderMinutes: null,
        notified: false
      };
    });
  }

  // 2. Bóc tách Thời khóa biểu tuần từ element chứa bảng (/WeeklyTimetable)
  function parseWeeklyTimetableFromDOM(rootEl, fallbackRefDate) {
    var container = rootEl || document.getElementById('weekly-timetable-container') || document;
    var table = container.querySelector('table');
    if (!table) return [];

    var headerRow = table.querySelector('thead tr') || table.querySelector('tr');
    var headCells = headerRow ? Array.from(headerRow.querySelectorAll('th, td')) : [];
    var headers = headCells.map(function(h) {
      return (h.textContent || h.innerText || '').replace(/\s+/g, ' ').trim();
    });

    // Xác định effective referenceDate để fallback ngày chính xác cho từng cột (Thứ 2..CN)
    var effectiveRefDate = fallbackRefDate;
    if (!effectiveRefDate && container.getAttribute) {
      effectiveRefDate = container.getAttribute('data-reference-date');
    }
    if (!effectiveRefDate && typeof window !== 'undefined' && window.location && window.location.search) {
      var searchMatch = window.location.search.match(/referenceDate=([0-9-]+)/i);
      if (searchMatch) effectiveRefDate = searchMatch[1];
    }

    function getDateForCol(colIdx) {
      if (!effectiveRefDate) return '';
      try {
        var parts = effectiveRefDate.split('-');
        if (parts.length === 3) {
          var satYear = parseInt(parts[0], 10);
          var satMonth = parseInt(parts[1], 10) - 1;
          var satDay = parseInt(parts[2], 10);
          var sat = new Date(satYear, satMonth, satDay);
          var offsetFromSat = colIdx - 6; // colIdx: 1 (Mon) -> -5 ... 6 (Sat) -> 0 ... 7 (Sun) -> +1
          var targetDate = new Date(sat);
          targetDate.setDate(sat.getDate() + offsetFromSat);
          var d = String(targetDate.getDate());
          if (d.length < 2) d = '0' + d;
          var m = String(targetDate.getMonth() + 1);
          if (m.length < 2) m = '0' + m;
          return d + '/' + m;
        }
      } catch (e) {}
      return '';
    }

    var allRows = Array.from(table.querySelectorAll('tbody tr')).filter(function(r) { return r.children.length >= 7; });
    if (allRows.length === 0) {
      allRows = Array.from(table.querySelectorAll('tr')).filter(function(r) { return r.children.length >= 7; });
      if (allRows.length > 0 && (allRows[0] === headerRow || allRows[0].querySelectorAll('th').length > 3)) {
        allRows.shift();
      }
    }

    var slots = [];
    allRows.forEach(function(row, rIdx) {
      var cells = Array.from(row.children);
      var slotText = (cells[0].textContent || cells[0].innerText || '').trim();
      var slotMatch = slotText.match(/^\\s*([1-9])\\b/);
      var slotNum = slotMatch ? parseInt(slotMatch[1], 10) : (rIdx + 1);

      for (var c = 1; c < cells.length; c++) {
        var cell = cells[c];
        var cellText = (cell.textContent || cell.innerText || '').trim();
        if (!cellText || cellText === '-' || cellText.length < 3) continue;

        var subMatch = cellText.match(/\\b([A-Z]{3}\\d{3}[A-Z0-9]?)\\b/i);
        if (!subMatch) continue;
        var subjectCode = subMatch[1].toUpperCase();

        var status = 'Not yet';
        var lowerCell = cellText.toLowerCase();
        if (lowerCell.indexOf('có mặt') !== -1 || lowerCell.indexOf('present') !== -1) {
          status = 'Present';
        } else if (lowerCell.indexOf('vắng') !== -1 || lowerCell.indexOf('absent') !== -1) {
          status = 'Absent';
        }

        var timeMatch = cellText.match(/(\\d{1,2}[h:]\\d{2}\\s*[-–]\\s*\\d{1,2}[h:]\\d{2})/i);
        var timeStr = timeMatch ? timeMatch[1].replace(/\\s+/g, '') : (slotNum === 1 ? '07h30-09h50' : '10h00-12h20');

        // Chuẩn hóa slot 1..6, 9 theo giờ học
        var tL = timeStr.toLowerCase();
        if (tL.indexOf('11h40') !== -1 || tL.indexOf('11:40') !== -1 || (tL.indexOf('08h00') !== -1 && tL.indexOf('11h') !== -1)) {
          slotNum = 9;
        } else {
          var hm = tL.match(/(\\d{1,2})[h:](\\d{2})/);
          if (hm) {
            var h = parseInt(hm[1], 10);
            var m = parseInt(hm[2], 10);
            var tot = h * 60 + m;
            if (tot < 9 * 60) slotNum = 1;
            else if (tot < 12 * 60) slotNum = 2;
            else if (tot < 14 * 60 + 30) slotNum = 3;
            else if (tot < 17 * 60) slotNum = 4;
            else if (tot < 19 * 60 + 30) slotNum = 5;
            else slotNum = 6;
          }
        }

        var roomMatch = cellText.match(/\\b([A-Z0-9]{2,4}[-_][A-Z0-9]+)\\b/);
        var room = roomMatch ? roomMatch[1] : '';

        var meetMatch = cellText.match(/https:\\/\\/meet\\.google\\.com\\/[a-z0-9-]+/i);
        var meetLink = meetMatch ? meetMatch[0] : '';

        var cellLines = cellText.split(/\\r?\\n/).map(function(l) { return l.trim(); }).filter(Boolean);
        var lecturer = '';
        var classCode = '';
        for (var li = 0; li < cellLines.length; li++) {
          var lineStr = cellLines[li];
          var lLow = lineStr.toLowerCase();
          if (
            lLow === 'offline' ||
            lLow === 'online' ||
            lLow === '-' ||
            lLow.indexOf('có mặt') !== -1 ||
            lLow.indexOf('present') !== -1 ||
            lLow.indexOf('vắng') !== -1 ||
            lLow.indexOf('absent') !== -1 ||
            /\\d{1,2}[h:]\\d{2}/.test(lineStr)
          ) {
            continue;
          }

          // Kiểm tra mã lớp (ví dụ: SE1990-NJ, SE1936-NET, BIT_...)
          var cMatch = lineStr.match(/\\b([A-Z]{2,4}\\d{4}[A-Z0-9-]*)\\b/i);
          if (cMatch) {
            classCode = cMatch[1].toUpperCase();
            var remaining = lineStr.replace(cMatch[0], '').replace(subjectCode, '').replace(/[-–\\s]+/g, '').trim();
            if (remaining.length > 2 && !/^[A-Z0-9_-]+$/i.test(remaining)) {
              lecturer = remaining;
            }
            continue;
          }

          if (
            lineStr.toUpperCase() !== subjectCode &&
            !/^[A-Z0-9]{2,4}[-_][A-Z0-9]+$/i.test(lineStr) &&
            lineStr.length >= 2 && lineStr.length <= 25
          ) {
            lecturer = lineStr;
          }
        }
        if (lecturer.toLowerCase() === 'offline' || lecturer.toLowerCase() === 'online') {
          lecturer = '';
        }

        var dayHeader = headers[c] || (c === 7 ? 'Chủ nhật' : ('Thứ ' + (c + 1)));
        var dateMatch = dayHeader.match(/(\\d{1,2}\\/\\d{1,2})/);
        var dateStr = dateMatch ? dateMatch[1] : getDateForCol(c);

        if (dateStr && dateStr.indexOf('/') !== -1) {
          var dmParts = dateStr.split('/');
          if (dmParts[0].length === 1) dmParts[0] = '0' + dmParts[0];
          if (dmParts[1].length === 1) dmParts[1] = '0' + dmParts[1];
          dateStr = dmParts[0] + '/' + dmParts[1];
        }

        var dayName = c === 7 ? 'Chủ nhật' : ('Thứ ' + (c + 1));
        if (dateStr) {
          dayName = dayName + ' (' + dateStr + ')';
        }

        var alertTime = '10:00';
        if (slotNum === 1) alertTime = '10:00';
        else if (slotNum === 2) alertTime = '12:30';
        else if (slotNum === 3) alertTime = '15:20';
        else if (slotNum === 4) alertTime = '17:50';
        else if (slotNum === 5) alertTime = '20:20';
        else if (slotNum === 6) alertTime = '22:50';
        else if (slotNum === 9) alertTime = '11:50';

        slots.push({
          id: 'slot_' + slotNum + '_' + subjectCode + '_' + (dateStr ? dateStr.replace('/', '_') : c) + '_' + slots.length,
          slot: slotNum,
          dayIndex: c + 1,
          dayName: dayName,
          date: dateStr,
          subjectCode: subjectCode,
          subjectName: subjectCode,
          classCode: classCode,
          room: room,
          time: timeStr,
          alertTime: alertTime,
          status: status,
          lecturer: lecturer,
          meetLink: meetLink,
          notified: false
        });
      }
    });

    return slots;
  }

  // 3. Trích xuất thông tin người dùng từ giao diện FAP
  function extractFapUserInfo() {
    var studentName = '';
    var rollNumber = '';
    var campus = 'Cơ sở Hà Nội (HN)';

    // Đọc trực tiếp từ thanh Topbar (Theme Jidox mới)
    var nameEl = document.querySelector('.fap-topbar-user h5, .nav-user h5, .noti-title h6');
    var idEl = document.querySelector('.fap-topbar-user h6, .nav-user h6, .noti-title small');
    var campusEl = document.querySelector('.jidox-campus-topbar__info .text-body, [title*="Cơ sở"]');

    if (nameEl && nameEl.textContent) studentName = nameEl.textContent.trim();
    if (idEl && idEl.textContent) rollNumber = idEl.textContent.trim().toUpperCase();
    if (campusEl && campusEl.textContent) campus = campusEl.textContent.trim();

    // Lọc bỏ nếu nameEl bắt nhầm từ khóa "Campus", "Select Campus", "FAP", "Đổi cơ sở"
    if (studentName) {
      var sLow = studentName.toLowerCase();
      if (sLow.indexOf('campus') !== -1 || sLow.indexOf('cơ sở') !== -1 || sLow === 'fap' || sLow.indexOf('select') !== -1) {
        studentName = '';
      }
    }

    // Dự phòng tìm theo Regex trên toàn trang
    var fullText = document.body ? (document.body.innerText || document.body.textContent || '') : '';
    if (!rollNumber) {
      var rollMatch = fullText.match(/\\b([A-Z]{2}\\d{5,7})\\b/i);
      if (rollMatch) rollNumber = rollMatch[1].toUpperCase();
    }
    if (!studentName && rollNumber) {
      var namePattern = '([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,4})\\s*' + rollNumber;
      var mName = fullText.match(new RegExp(namePattern, 'i'));
      if (mName && mName[1]) studentName = mName[1].trim();
    }
    if (!studentName || studentName === 'NH' || studentName.length <= 3) {
      studentName = 'Nguyễn Duy Hưng';
    }
    if (!rollNumber) {
      rollNumber = 'HE190591';
    }

    var program = 'BIT_SE_19C_NJ';
    var progMatch = fullText.match(/M\\u00e3 ch\\u01b0\\u01a1ng tr\\u00ecnh[:\\s\\n]+([A-Z0-9_]+)/i);
    if (progMatch) program = progMatch[1].trim();

    return {
      name: studentName,
      studentId: rollNumber,
      program: program,
      campus: campus,
      email: rollNumber.toLowerCase() + '@fpt.edu.vn'
    };
  }

  // 4. Bóc tách Bảng điểm môn học từ /Report/Grade hoặc /Grade/StudentTranscript.aspx
  function parseGradeReportFromDOM(rootEl) {
    var results = [];
    var tables = Array.from((rootEl || document).querySelectorAll('table'));

    for (var t = 0; t < tables.length; t++) {
      var table = tables[t];
      var rows = Array.from(table.querySelectorAll('tr'));
      if (rows.length < 2) continue;

      var currentCourse = null;

      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        var cells = Array.from(row.querySelectorAll('td, th'));
        if (cells.length < 3) continue;

        var rowText = cells.map(function(c) { return (c.innerText || c.textContent || '').trim(); });
        var joined = rowText.join(' ');

        // Kiểm tra xem hàng có chứa mã môn học (ví dụ: SWD392, MMA301)
        var codeMatch = joined.match(/\\b([A-Z]{3}\\d{3}[A-Z0-9]?)\\b/);

        // Kiểm tra nếu là hàng tiêu đề môn
        if (codeMatch && (joined.indexOf('Tín chỉ') !== -1 || joined.indexOf('Credits') !== -1 || cells.length >= 6)) {
          if (currentCourse && currentCourse.subjectCode) {
            results.push(currentCourse);
          }

          var code = codeMatch[1].toUpperCase();
          var name = '';
          var cred = 3;
          var avgMark = null;
          var status = 'In Progress';

          // Tìm tín chỉ
          var credMatch = joined.match(/(\\d+)\\s*(?:tín chỉ|credits|TC)/i);
          if (credMatch) cred = parseInt(credMatch[1], 10);

          // Tìm tên môn
          for (var ci = 0; ci < rowText.length; ci++) {
            var txt = rowText[ci];
            if (txt.length > 5 && txt !== code && !/^\\d+$/.test(txt) && txt.indexOf('Credits') === -1) {
              name = txt;
              break;
            }
          }

          // Tìm trạng thái Passed / Failed
          var jLower = joined.toLowerCase();
          if (jLower.indexOf('passed') !== -1 || jLower.indexOf('qua môn') !== -1 || jLower.indexOf('đạt') !== -1) {
            status = 'Passed';
          } else if (jLower.indexOf('failed') !== -1 || jLower.indexOf('trượt môn') !== -1 || jLower.indexOf('học lại') !== -1) {
            status = 'Failed';
          }

          // Tìm điểm trung bình
          var avgMatch = joined.match(/(?:Average|Điểm TB|Điểm tổng kết|Avg)[:\\s]*([0-9]+(?:\\.[0-9]+)?)/i);
          if (avgMatch) {
            avgMark = parseFloat(avgMatch[1]);
          }

          currentCourse = {
            id: 'grade_' + code + '_' + results.length,
            subjectCode: code,
            subjectName: name || code,
            credits: cred,
            term: 'Kỳ hiện tại',
            averageMark: avgMark,
            status: status,
            lastUpdated: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            components: []
          };
          continue;
        }

        // Nếu là hàng điểm thành phần (Assignment, Progress Test, Practical Exam, Final Exam...)
        if (currentCourse) {
          var compName = '';
          var weight = '';
          var markVal = null;
          var comment = '';

          for (var c = 0; c < rowText.length; c++) {
            var cellVal = rowText[c];
            if (!compName && /^(Assignment|Progress Test|Lab|PE|FE|Practical|Final|Quiz|Presentation|Review|Workshop)/i.test(cellVal)) {
              compName = cellVal;
            } else if (!weight && /\\d{1,2}%/.test(cellVal)) {
              weight = cellVal;
            } else if (markVal === null && /^\\d+(?:\\.\\d+)?$/.test(cellVal)) {
              markVal = parseFloat(cellVal);
            } else if (cellVal.length > 2 && cellVal !== compName && cellVal !== weight) {
              comment = cellVal;
            }
          }

          if (compName) {
            currentCourse.components.push({
              name: compName,
              weight: weight || '-',
              value: markVal,
              comment: comment || ''
            });

            // Nếu chưa có averageMark nhưng hàng này là Final/Average
            if (/average|tổng kết/i.test(compName) && markVal !== null) {
              currentCourse.averageMark = markVal;
              if (markVal >= 5.0) currentCourse.status = 'Passed';
              else currentCourse.status = 'Failed';
            }
          }
        }
      }

      if (currentCourse && currentCourse.subjectCode) {
        results.push(currentCourse);
      }
    }

    // Dự phòng: Nếu FAP dùng bảng tổng hợp 1 dòng 1 môn (Mã môn, Tên môn, Điểm TB, Trạng thái)
    if (results.length === 0) {
      for (var tb = 0; tb < tables.length; tb++) {
        var tEl = tables[tb];
        var trs = Array.from(tEl.querySelectorAll('tr'));
        for (var rIdx = 0; rIdx < trs.length; rIdx++) {
          var tds = Array.from(trs[rIdx].querySelectorAll('td'));
          if (tds.length < 4) continue;
          var tTexts = tds.map(function(td) { return (td.innerText || td.textContent || '').trim(); });
          var rowStr = tTexts.join(' ');
          var cM = rowStr.match(/\\b([A-Z]{3}\\d{3}[A-Z0-9]?)\\b/);
          if (cM) {
            var sCode = cM[1].toUpperCase();
            var sAvg = null;
            var sStatus = 'In Progress';
            for (var k = 0; k < tTexts.length; k++) {
              var val = tTexts[k];
              if (/^\\d+(?:\\.\\d+)?$/.test(val) && parseFloat(val) <= 10) {
                sAvg = parseFloat(val);
              }
              if (/passed/i.test(val)) sStatus = 'Passed';
              if (/failed/i.test(val)) sStatus = 'Failed';
            }
            results.push({
              id: 'grade_row_' + sCode + '_' + results.length,
              subjectCode: sCode,
              subjectName: sCode,
              credits: 3,
              term: 'Kỳ hiện tại',
              averageMark: sAvg,
              status: sStatus,
              lastUpdated: new Date().toLocaleDateString('vi-VN'),
              components: []
            });
          }
        }
      }
    }

    return results;
  }

  // 4. Cào trọn bộ 17 tuần cả kỳ qua AJAX WeekPartial (1 Click lấy cả kỳ)
  window.scrapeFullSemesterTimetable = function() {
    try {
      if (window.__isScrapingFullSemester) {
        console.log('[Scraper] Đang cào full kỳ rồi...');
        return;
      }
      window.__isScrapingFullSemester = true;

      var allWeeks = [];
      var now = new Date();
      var jsDay = now.getDay();
      var diffToSaturday = 6 - jsDay;
      var currentSaturday = new Date(now);
      currentSaturday.setDate(now.getDate() + diffToSaturday);

      // Nếu trang hiện tại có referenceDate, dùng nó làm mốc
      var container = document.getElementById('weekly-timetable-container');
      if (container && container.getAttribute('data-reference-date')) {
        var pageRef = container.getAttribute('data-reference-date');
        var pParts = pageRef.split('-');
        if (pParts.length === 3) {
          currentSaturday = new Date(parseInt(pParts[0], 10), parseInt(pParts[1], 10) - 1, parseInt(pParts[2], 10));
        }
      }

      for (var offset = -6; offset <= 10; offset++) {
        var sat = new Date(currentSaturday);
        sat.setDate(currentSaturday.getDate() + offset * 7);
        var y = sat.getFullYear();
        var m = String(sat.getMonth() + 1);
        if (m.length < 2) m = '0' + m;
        var d = String(sat.getDate());
        if (d.length < 2) d = '0' + d;
        allWeeks.push(y + '-' + m + '-' + d);
      }

      var banner = document.getElementById('toolkit_full_semester_banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'toolkit_full_semester_banner';
        banner.style.cssText = 'position:fixed;top:12px;left:12px;right:12px;z-index:999999;background:#10B981;color:#FFFFFF;padding:12px;border-radius:10px;font-family:sans-serif;font-size:13px;font-weight:bold;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,0.35);';
        document.body.appendChild(banner);
      }
      banner.innerHTML = '🚀 ToolKit đang cào trọn bộ 17 tuần cả kỳ... (0/' + allWeeks.length + ')';

      var allSlots = [];
      var queueIndex = 0;
      var completed = 0;
      var userObj = extractFapUserInfo();

      function fetchWeek(refDate, cb) {
        fetch('/WeeklyTimetable/WeekPartial?referenceDate=' + refDate, {
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
          .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
          })
          .then(function(html) {
            if (html && html.indexOf('<table') !== -1) {
              var tempDiv = document.createElement('div');
              tempDiv.innerHTML = html;
              tempDiv.style.display = 'none';
              document.body.appendChild(tempDiv);
              var wSlots = parseWeeklyTimetableFromDOM(tempDiv, refDate);
              document.body.removeChild(tempDiv);
              if (wSlots && wSlots.length > 0) {
                allSlots = allSlots.concat(wSlots);
              }
            }
            cb();
          })
          .catch(function(err) {
            console.warn('[Scraper] fetchWeek error for', refDate, err);
            cb();
          });
      }

      function processNextBatch() {
        if (queueIndex >= allWeeks.length) {
          window.__isScrapingFullSemester = false;
          var uniqueMap = {};
          var finalSlots = [];
          allSlots.forEach(function(s) {
            var key = (s.date || '') + '_' + s.slot + '_' + s.subjectCode;
            if (!uniqueMap[key]) {
              uniqueMap[key] = true;
              finalSlots.push(s);
            }
          });

          banner.innerHTML = '✅ Đã cào FULL ' + finalSlots.length + ' ca học của tất cả ' + allWeeks.length + ' tuần! Đang nạp vào ứng dụng...';
          setTimeout(function() {
            if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
          }, 2500);

          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'FAP_WEEKLY_TIMETABLE_SYNCED',
              user: userObj,
              slots: finalSlots,
              isFullSemester: true,
              totalWeeks: allWeeks.length
            }));
          }
          return;
        }

        var batch = allWeeks.slice(queueIndex, queueIndex + 3);
        queueIndex += 3;
        var batchCount = 0;
        batch.forEach(function(refDate) {
          fetchWeek(refDate, function() {
            completed++;
            banner.innerHTML = '🚀 ToolKit đang cào FULL 17 tuần cả kỳ... (' + completed + '/' + allWeeks.length + ' tuần - ' + allSlots.length + ' ca)';
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'FAP_SCRAPING_PROGRESS',
                completed: completed,
                total: allWeeks.length,
                foundSlots: allSlots.length
              }));
            }
            batchCount++;
            if (batchCount >= batch.length) {
              setTimeout(processNextBatch, 150);
            }
          });
        });
      }

      processNextBatch();
    } catch(err) {
      window.__isScrapingFullSemester = false;
      console.warn('Lỗi cào full kỳ:', err);
    }
  };

  // 5. Điều phối bóc tách dữ liệu tự động
  var hasSyncedExam = false;
  var hasSyncedTimetable = false;
  var hasSyncedGrades = false;

  function doScrape() {
    try {
      var currentUrl = (window.location.href || '').toLowerCase();
      var pathname = (window.location.pathname || '').toLowerCase();

      var isAuth =
        pathname.indexOf('/auth/login') !== -1 ||
        currentUrl.indexOf('/auth/login') !== -1 ||
        currentUrl.indexOf('accounts.google.com') !== -1 ||
        currentUrl.indexOf('feid.fpt.edu.vn') !== -1 ||
        currentUrl.indexOf('challenges.cloudflare') !== -1;

      if (isAuth) return;

      var userObj = extractFapUserInfo();

      // TRƯỜNG HỢP 1: Lịch thi (/ExamSchedule hoặc /Exam/ScheduleExams.aspx)
      if (pathname.indexOf('examschedule') !== -1 || pathname.indexOf('scheduleexams') !== -1 || currentUrl.indexOf('/exam') !== -1) {
        var exams = parseExamsFromHtmlOrDOM();
        if (exams.length > 0 && (!hasSyncedExam || exams.length !== window.__lastExamCount)) {
          hasSyncedExam = true;
          window.__lastExamCount = exams.length;
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'FAP_EXAM_SCHEDULE_SYNCED',
              user: userObj,
              exams: exams
            }));
          }
        }
        return;
      }

      // TRƯỜNG HỢP 2: Bảng điểm môn học (/Report/Grade hoặc /Grade/StudentTranscript.aspx)
      if (pathname.indexOf('report/grade') !== -1 || pathname.indexOf('studenttranscript') !== -1 || pathname.indexOf('/grade') !== -1 || currentUrl.indexOf('/grade') !== -1) {
        var grades = parseGradeReportFromDOM();
        if (grades.length > 0 && (!hasSyncedGrades || grades.length !== window.__lastGradeCount)) {
          hasSyncedGrades = true;
          window.__lastGradeCount = grades.length;
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'FAP_GRADE_REPORT_SYNCED',
              user: userObj,
              grades: grades
            }));
          }
        }
        return;
      }

      // TRƯỜNG HỢP 3: Thời khóa biểu (/WeeklyTimetable hoặc /Report/ScheduleOfWeek.aspx)
      if (pathname.indexOf('weeklytimetable') !== -1 || pathname.indexOf('scheduleofweek') !== -1 || currentUrl.indexOf('timetable') !== -1) {
        var container = document.getElementById('weekly-timetable-container');
        var refDate = container ? container.getAttribute('data-reference-date') : null;
        var slots = parseWeeklyTimetableFromDOM(container, refDate);

        if (slots.length > 0) {
          if (!hasSyncedTimetable || slots.length !== window.__lastSlotCount) {
            hasSyncedTimetable = true;
            window.__lastSlotCount = slots.length;
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'FAP_WEEKLY_TIMETABLE_SYNCED',
                user: userObj,
                slots: slots,
                isFullSemester: false
              }));
            }
          }

          // Tự động kích hoạt cào trọn bộ 17 tuần cả kỳ nếu chưa cào
          if (!window.__hasAutoScrapedFullSemester && typeof window.scrapeFullSemesterTimetable === 'function') {
            window.__hasAutoScrapedFullSemester = true;
            setTimeout(function() {
              window.scrapeFullSemesterTimetable();
            }, 600);
          }
        } else if (container && !window.__isDirectFetchTriggered) {
          // Nếu bảng chưa render trong container (đang loading AJAX), fetch trực tiếp ngay!
          window.__isDirectFetchTriggered = true;
          var directRefDate = container.getAttribute('data-reference-date');
          var fetchUrl = (container.getAttribute('data-fetch-url') || '/WeeklyTimetable/WeekPartial') + (directRefDate ? ('?referenceDate=' + directRefDate) : '');
          fetch(fetchUrl, {
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
          })
            .then(function(res) { return res.text(); })
            .then(function(html) {
              var tempDiv = document.createElement('div');
              tempDiv.innerHTML = html;
              tempDiv.style.display = 'none';
              document.body.appendChild(tempDiv);
              var directSlots = parseWeeklyTimetableFromDOM(tempDiv, directRefDate);
              document.body.removeChild(tempDiv);
              if (directSlots && directSlots.length > 0) {
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'FAP_WEEKLY_TIMETABLE_SYNCED',
                    user: userObj,
                    slots: directSlots,
                    isFullSemester: false
                  }));
                }
                if (!window.__hasAutoScrapedFullSemester && typeof window.scrapeFullSemesterTimetable === 'function') {
                  window.__hasAutoScrapedFullSemester = true;
                  setTimeout(function() {
                    window.scrapeFullSemesterTimetable();
                  }, 600);
                }
              }
            })
            .catch(function(e) {});
        }
        return;
      }
    } catch(e) {
      console.warn('Scraper error:', e);
    }
  }

  // Đăng ký toàn cục để các modal gọi an toàn
  window.doScrape = doScrape;
  window.doAutoOrManualScrape = doScrape;
  window.parseGradeReportFromDOM = parseGradeReportFromDOM;
  window.parseExamsFromHtmlOrDOM = parseExamsFromHtmlOrDOM;

  // Chạy ngay khi tải xong
  doScrape();

  // Polling chu kỳ 800ms để bắt kịp AJAX render
  var checkCount = 0;
  var timer = setInterval(function() {
    checkCount++;
    doScrape();
    if (checkCount > 15) {
      clearInterval(timer);
    }
  }, 800);

  // Theo dõi DOM thay đổi (MutationObserver)
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function() {
      doScrape();
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Lắng nghe click chuyển tuần / chuyển trang
  document.addEventListener('click', function() {
    setTimeout(doScrape, 600);
    setTimeout(doScrape, 1500);
  });
})();
`;
