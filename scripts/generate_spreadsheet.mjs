import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';

const prisma = new PrismaClient();

async function generateSpreadsheet() {
  console.log('Fetching data from database...');
  
  // 1. Fetch Bookings for "予約一覧" (Booking List)
  const bookings = await prisma.booking.findMany({
    include: {
      user: true,
      studio: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const bookingRows = bookings.map(b => ({
    '予約されたタイムスタンプ': b.createdAt.toLocaleString('ja-JP'),
    '会員ナンバー': b.user.memberNo,
    '名前': b.user.name,
    '電話番号': b.user.phone,
    'メールアドレス': b.user.email,
    'Studio名': b.studio.name,
    '予約日': new Date(b.date).toLocaleDateString('ja-JP'),
    '開始時間': b.startTime,
    'キャンセル有無': b.status === 'ACTIVE' ? '有効' : (b.status === 'CANCELLED_BY_USER' ? 'ユーザーキャンセル' : '管理者キャンセル'),
    'ご利用人数': b.peopleCount + '名',
    '金額': b.totalPrice + '円'
  }));

  // 2. Fetch Users for "顧客リスト" (Customer List)
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: { bookings: { where: { status: 'ACTIVE' } } }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const userRows = users.map(u => ({
    '会員ナンバー': u.memberNo,
    '名前': u.name,
    '電話番号': u.phone,
    'メールアドレス': u.email,
    'ご利用回数': u._count.bookings + '回',
    'キャンセル回数': u.cancelCount + '回',
    'アカウント状態': u.isBanned ? 'BAN（利用停止）' : '正常'
  }));

  // Create workbook and worksheets
  const wb = xlsx.utils.book_new();
  const wsBookings = xlsx.utils.json_to_sheet(bookingRows);
  const wsUsers = xlsx.utils.json_to_sheet(userRows);

  // Auto-size columns (rough estimate)
  const wscols = [{wch: 20}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 25}, {wch: 10}, {wch: 12}, {wch: 10}, {wch: 15}, {wch: 10}, {wch: 10}];
  wsBookings['!cols'] = wscols;
  wsUsers['!cols'] = wscols;

  xlsx.utils.book_append_sheet(wb, wsBookings, '予約一覧');
  xlsx.utils.book_append_sheet(wb, wsUsers, '顧客リスト');

  const filePath = 'customer_management_v4.xlsx';
  xlsx.writeFile(wb, filePath);
  
  console.log(\`Successfully generated spreadsheet at: \${filePath}\`);
}

generateSpreadsheet()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
