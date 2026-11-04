// scripts/test-monthly-logic.js
// Unit test kiểm tra logic tính ngày đến hạn hàng tháng (Monthly Habit Status)

function getMidnight(d) {
  const res = new Date(d);
  res.setHours(0, 0, 0, 0);
  return res;
}

function getDaysDiff(targetDate, baseDate) {
  const t = getMidnight(targetDate).getTime();
  const b = getMidnight(baseDate).getTime();
  return Math.round((t - b) / (1000 * 60 * 60 * 24));
}

// Lấy ngày hợp lệ của một tháng (nếu targetDay > số ngày trong tháng thì lấy ngày cuối tháng)
function getValidMonthlyDate(year, monthIndex, targetDay) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const validDay = Math.min(targetDay, daysInMonth);
  return new Date(year, monthIndex, validDay, 0, 0, 0, 0);
}

/**
 * Logic tính toán trạng thái chu kỳ hàng tháng
 * @param {object} item { dayOfMonth, lastCompletedDate }
 * @param {Date} now Thời điểm hiện tại giả định
 */
function calculateMonthlyStatus(item, now = new Date()) {
  const targetDay = Math.min(31, Math.max(1, parseInt(item.dayOfMonth || 1, 10)));
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // 1. Ngày hạn của THÁNG NÀY (đã tự co về ngày cuối tháng nếu tháng ngắn)
  const dueDateThisMonth = getValidMonthlyDate(currentYear, currentMonth, targetDay);

  // 2. Kiểm tra xem việc này đã được hoàn thành cho chu kỳ tháng này chưa
  let isCompletedForThisMonth = false;
  if (item.lastCompletedDate) {
    const lastDone = getMidnight(new Date(item.lastCompletedDate));
    // Nếu ngày hoàn thành gần nhất nằm trong tháng này VÀ từ ngày đến hạn trở đi (hoặc trong cùng tháng khi ngày đến hạn là hôm nay)
    if (lastDone.getFullYear() === currentYear && lastDone.getMonth() === currentMonth) {
      // Đã đánh dấu hoàn thành trong tháng này
      isCompletedForThisMonth = true;
    } else if (lastDone >= dueDateThisMonth) {
      isCompletedForThisMonth = true;
    }
  }

  let dueDate;
  let urgency = 'safe';
  let statusText = '';
  let cycleInfo = `Ngày ${targetDay} hàng tháng`;

  if (isCompletedForThisMonth) {
    // Đã hoàn thành tháng này -> Kỳ tiếp theo là THÁNG SAU
    dueDate = getValidMonthlyDate(currentYear, currentMonth + 1, targetDay);
    const daysRemaining = getDaysDiff(dueDate, now);
    statusText = `Đã xong tháng này (kỳ tới còn ${daysRemaining} ngày)`;
    urgency = 'safe';
  } else {
    // Chưa hoàn thành tháng này
    dueDate = dueDateThisMonth;
    const daysRemaining = getDaysDiff(dueDate, now);

    if (daysRemaining < 0) {
      urgency = 'overdue';
      statusText = `Quá hạn ${Math.abs(daysRemaining)} ngày!`;
    } else if (daysRemaining === 0) {
      urgency = 'overdue'; // Hôm nay đến hạn cần làm
      statusText = 'Hôm nay đến hạn!';
    } else if (daysRemaining <= 3) {
      urgency = 'warning';
      statusText = `Sắp đến hạn (còn ${daysRemaining} ngày)`;
    } else {
      urgency = 'safe';
      statusText = `Còn ${daysRemaining} ngày`;
    }
  }

  const daysRemaining = getDaysDiff(dueDate, now);

  return {
    targetDay,
    dueDate,
    daysRemaining,
    urgency,
    statusText,
    cycleInfo,
    isCompletedForThisMonth,
  };
}

// BỘ TEST CASES
const testCases = [
  {
    name: 'Case 1: Hôm nay 31/10, việc ngày 31 hàng tháng, CHƯA hoàn thành',
    item: { dayOfMonth: 31, lastCompletedDate: null },
    now: new Date(2026, 9, 31), // 31 tháng 10 năm 2026
    expectedStatus: 'Hôm nay đến hạn!',
    expectedDays: 0,
    expectedUrgency: 'overdue',
  },
  {
    name: 'Case 2: Hôm nay 31/10, việc ngày 31 hàng tháng, ĐÃ hoàn thành hôm nay',
    item: { dayOfMonth: 31, lastCompletedDate: '2026-10-31' },
    now: new Date(2026, 9, 31),
    // Kỳ tới là tháng 11. Tháng 11 có 30 ngày -> hạn là 30/11. Từ 31/10 tới 30/11 là 30 ngày.
    expectedStatus: 'Đã xong tháng này (kỳ tới còn 30 ngày)',
    expectedDays: 30,
    expectedUrgency: 'safe',
  },
  {
    name: 'Case 3: Ngày 31 vào Tháng 2 năm KHÔNG nhuận (2026)',
    item: { dayOfMonth: 31, lastCompletedDate: null },
    now: new Date(2026, 1, 28), // 28/02/2026
    // Tháng 2 năm 2026 có 28 ngày -> ngày 31 tự co về 28/2 -> hôm nay đến hạn!
    expectedStatus: 'Hôm nay đến hạn!',
    expectedDays: 0,
    expectedUrgency: 'overdue',
  },
  {
    name: 'Case 4: Ngày 31 vào Tháng 2 năm NHUẬN (2028)',
    item: { dayOfMonth: 31, lastCompletedDate: null },
    now: new Date(2028, 1, 29), // 29/02/2028
    // Tháng 2 năm 2028 có 29 ngày -> ngày 31 tự co về 29/2 -> hôm nay đến hạn!
    expectedStatus: 'Hôm nay đến hạn!',
    expectedDays: 0,
    expectedUrgency: 'overdue',
  },
  {
    name: 'Case 5: Chuyển giao năm (31/12/2026 -> 31/01/2027)',
    item: { dayOfMonth: 31, lastCompletedDate: '2026-12-31' },
    now: new Date(2026, 11, 31),
    // Kỳ tới là 31/01/2027 -> còn 31 ngày
    expectedStatus: 'Đã xong tháng này (kỳ tới còn 31 ngày)',
    expectedDays: 31,
    expectedUrgency: 'safe',
  },
  {
    name: 'Case 6: Hôm nay 15/10, việc ngày 20 hàng tháng, chưa đến hạn',
    item: { dayOfMonth: 20, lastCompletedDate: '2026-09-20' },
    now: new Date(2026, 9, 15),
    expectedStatus: 'Còn 5 ngày',
    expectedDays: 5,
    expectedUrgency: 'safe',
  },
  {
    name: 'Case 7: Hôm nay 25/10, việc ngày 20 hàng tháng, ĐÃ QUÁ HẠN 5 ngày',
    item: { dayOfMonth: 20, lastCompletedDate: '2026-09-20' },
    now: new Date(2026, 9, 25),
    expectedStatus: 'Quá hạn 5 ngày!',
    expectedDays: -5,
    expectedUrgency: 'overdue',
  },
];

console.log('=== CHẠY UNIT TEST LOGIC MONTHLY HABIT ===\n');
let passed = 0;
for (const tc of testCases) {
  const res = calculateMonthlyStatus(tc.item, tc.now);
  const ok = res.daysRemaining === tc.expectedDays && res.urgency === tc.expectedUrgency && (res.statusText === tc.expectedStatus || tc.expectedStatus.includes(res.statusText));
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${tc.name}`);
  console.log(`       Output: "${res.statusText}" (daysRemaining: ${res.daysRemaining}, urgency: ${res.urgency}, dueDate: ${res.dueDate.toISOString().slice(0, 10)})`);
  if (!ok) {
    console.log(`       Expected: days: ${tc.expectedDays}, urgency: ${tc.expectedUrgency}`);
  }
  if (ok) passed++;
}

console.log(`\nKết quả: ${passed}/${testCases.length} tests passed.`);
