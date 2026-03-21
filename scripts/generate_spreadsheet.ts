import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function generateCSVs() {
  console.log('Fetching data from database to generate CSVs...');
  
  // 1. Fetch Bookings for "予約一覧"
  const bookings = await prisma.booking.findMany({
    include: { user: true, studio: true },
    orderBy: { createdAt: 'desc' }
  });

  const BOM = '\uFEFF';
  let bookingCsv = BOM + '予約されたタイムスタンプ,会員ナンバー,名前,電話番号,メールアドレス,Studio名,予約日,開始時間,終了時間,キャンセル有無,ご利用人数,金額\n';
  
  for (const b of bookings) {
    const statusText = b.status === 'ACTIVE' ? '有効' : (b.status === 'CANCELLED_BY_USER' ? 'ユーザーキャンセル' : '管理者キャンセル');
    bookingCsv += `${b.createdAt.toLocaleString('ja-JP')},${b.user.memberNo},${b.user.name},${b.user.phone},${b.user.email},${b.studio.name},${new Date(b.date).toLocaleDateString('ja-JP')},${b.startTime},${b.endTime},${statusText},${b.peopleCount}名,${b.totalPrice}円\n`;
  }

  // 2. Fetch Users for "顧客リスト"
  const users = await prisma.user.findMany({
    include: { _count: { select: { bookings: { where: { status: 'ACTIVE' } } } } },
    orderBy: { createdAt: 'desc' }
  });

  let userCsv = BOM + '会員ナンバー,名前,電話番号,メールアドレス,ご利用回数,キャンセル回数,アカウント状態\n';
  
  for (const u of users) {
    const statusText = u.isBanned ? 'BAN（利用停止）' : '正常';
    userCsv += `${u.memberNo},${u.name},${u.phone},${u.email},${u._count.bookings}回,${u.cancelCount}回,${statusText}\n`;
  }

  fs.writeFileSync('customer_management_1_bookings.csv', bookingCsv, 'utf8');
  fs.writeFileSync('customer_management_2_users.csv', userCsv, 'utf8');
  
  console.log('Successfully generated CSVs for Google Spreadsheet import!');
}

generateCSVs()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
