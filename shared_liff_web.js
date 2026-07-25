/**
 * shared_liff_web.js — 静的ホスト(GitHub Pages)版のLIFF共通スクリプト
 * =================================================================
 * GASのiframeサンドボックスでは liff.init() が固まるため、LIFF画面は
 * 普通のHTTPS静的ホストに置き、データはGAS Web Appへ fetch で送る。
 * インターフェースはGAS版 shared_liff.html と同じ（CAKEME.* / esc / LIFF_ID）。
 *
 * 設定は各ページの <script>window.LIFF_CFG={liffId,gasUrl}</script> で注入。
 */
(function () {
  var CFG = window.LIFF_CFG || {};
  window.LIFF_ID = CFG.liffId || '';
  var GAS_URL = CFG.gasUrl || '';

  window.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  window.CAKEME = {
    token: null,
    profile: null,

    init: function (onReady) {
      if (typeof liff === 'undefined') {
        document.body.innerHTML = '<div class="wrap"><p class="err">LIFF SDK未ロード</p></div>'; return;
      }
      if (!LIFF_ID) { document.body.innerHTML = '<div class="wrap"><p class="err">LIFF未設定</p></div>'; return; }
      liff.init({ liffId: LIFF_ID }).then(function () {
        if (!liff.isLoggedIn()) { liff.login(); return Promise.reject(new Error('redirecting')); }
        CAKEME.token = liff.getAccessToken();
        return liff.getProfile();
      }).then(function (profile) {
        if (profile) CAKEME.profile = profile;
        if (onReady) onReady();
      }).catch(function (e) {
        if (String(e && e.message).indexOf('redirect') >= 0) return; // ログインへ遷移中
        document.body.innerHTML = '<div class="wrap"><p class="err">初期化エラー: ' + (e && e.message) + '</p></div>';
      });
    },

    /** GAS Web App へ fetch（CORS回避のため text/plain・no-preflight） */
    call: function (api, payload) {
      return fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ api: api, payload: payload || {}, accessToken: CAKEME.token })
      }).then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.ok) {
            // getBootstrap の会社設定言語で画面を自動翻訳（既定タイ語）
            if (api === 'getBootstrap' && res.data && res.data.company && res.data.company.lang) {
              try { window.setLang(res.data.company.lang); } catch (e) {}
            }
            return res.data;
          }
          throw new Error((res && res.error) || 'error');
        });
    },

    close: function () { try { liff.closeWindow(); } catch (e) {} },

    toast: function (msg) {
      var t = document.getElementById('toast');
      if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
      t.textContent = (window.t ? window.t(msg) : msg); t.classList.add('show');
      setTimeout(function () { t.classList.remove('show'); }, 2200);
    },

    withLoading: function (btn, fn) {
      var orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
      Promise.resolve().then(fn).then(function () { btn.disabled = false; btn.innerHTML = orig; })
        .catch(function (e) { btn.disabled = false; btn.innerHTML = orig; CAKEME.toast(t('エラー: ') + (e && e.message ? e.message : e)); });
    }
  };

  // =========================================================================
  // i18n（顧客向けLIFF画面の多言語化・既定タイ語 / 英語）
  // ソースは日本語。日本語文字列をキーに th/en へ置換する。
  // getBootstrap の company.lang で自動適用。再翻訳のため原文を WeakMap に保持。
  // =========================================================================
  var I18N = {
    // ---- 共通 ----
    '読み込み中…': { th: 'กำลังโหลด…', en: 'Loading…' },
    '保存する': { th: 'บันทึก', en: 'Save' },
    '保存しました': { th: 'บันทึกเรียบร้อยแล้วค่ะ', en: 'Saved' },
    '削除': { th: 'ลบ', en: 'Delete' },
    '編集': { th: 'แก้ไข', en: 'Edit' },
    '追加': { th: 'เพิ่ม', en: 'Add' },
    'キャンセル': { th: 'ยกเลิก', en: 'Cancel' },
    '閉じる': { th: 'ปิด', en: 'Close' },
    '取消': { th: 'ยกเลิก', en: 'Void' },
    'エラー: ': { th: 'ข้อผิดพลาด: ', en: 'Error: ' },
    'まだありません': { th: 'ยังไม่มีข้อมูลค่ะ', en: 'Nothing yet' },
    '読み込みエラー: ': { th: 'โหลดข้อมูลผิดพลาด: ', en: 'Load error: ' },

    // ---- 設定 ----
    '設定': { th: 'ตั้งค่า', en: 'Settings' },
    '既定のケーキ・配達先や、通知の受け取り方を設定します。': { th: 'ตั้งค่าเค้ก/ที่จัดส่งเริ่มต้น และการรับการแจ้งเตือนค่ะ', en: 'Set your default cake, delivery site, and notifications.' },
    '会社情報': { th: 'ข้อมูลบริษัท', en: 'Company info' },
    '会社名': { th: 'ชื่อบริษัท', en: 'Company name' },
    '担当者名': { th: 'ชื่อผู้ติดต่อ', en: 'Contact name' },
    '電話番号': { th: 'เบอร์โทรศัพท์', en: 'Phone' },
    '会社デフォルト': { th: 'ค่าเริ่มต้นของบริษัท', en: 'Company defaults' },
    'お客様（担当者）に届くLINEメッセージ・注文画面の言語です。既定はタイ語。': { th: 'ภาษาของข้อความ LINE และหน้าสั่งซื้อที่ส่งถึงผู้ติดต่อ ค่าเริ่มต้นคือภาษาไทยค่ะ', en: 'Language of LINE messages and the order screen sent to your contact. Default is Thai.' },
    '既定の配達先オフィス': { th: 'ออฟฟิศที่จัดส่งเริ่มต้น', en: 'Default delivery office' },
    '既定のケーキサイズ': { th: 'ขนาดเค้กเริ่มต้น', en: 'Default cake size' },
    '通知': { th: 'การแจ้งเตือน', en: 'Notifications' },
    'ご注文のお知らせは、各従業員の': { th: 'การแจ้งเตือนการสั่งซื้อจะส่งใน', en: 'Order reminders are sent on the' },
    '誕生日の前日': { th: 'วันก่อนวันเกิด 1 วัน', en: 'day before each birthday' },
    'に届きます。': { th: 'ของพนักงานแต่ละคนค่ะ', en: '.' },
    'この端末（担当者）に通知を受け取る': { th: 'รับการแจ้งเตือนที่เครื่องนี้ (ผู้ติดต่อ)', en: 'Receive notifications on this device (contact)' },
    '会社名・担当者名は必須です': { th: 'กรุณากรอกชื่อบริษัทและชื่อผู้ติดต่อค่ะ', en: 'Company name and contact name are required.' },

    // ---- 配達先 ----
    '配達先オフィス': { th: 'ออฟฟิศที่จัดส่ง', en: 'Delivery office' },
    'ケーキをお届けするオフィスを登録します。複数拠点も追加できます。': { th: 'ลงทะเบียนออฟฟิศสำหรับจัดส่งเค้ก เพิ่มได้หลายสาขาค่ะ', en: 'Register offices for cake delivery. You can add multiple sites.' },
    '拠点を追加': { th: 'เพิ่มสาขา', en: 'Add site' },
    '拠点を編集': { th: 'แก้ไขสาขา', en: 'Edit site' },
    '拠点名': { th: 'ชื่อสาขา', en: 'Site name' },
    '住所': { th: 'ที่อยู่', en: 'Address' },
    'フロア・受付情報': { th: 'ชั้น/จุดรับของ', en: 'Floor / reception' },
    '受取担当': { th: 'ผู้รับ', en: 'Receiver' },
    '配達可能時間帯': { th: 'ช่วงเวลาที่จัดส่งได้', en: 'Available delivery time' },
    '登録済み拠点': { th: 'สาขาที่ลงทะเบียนแล้ว', en: 'Registered sites' },
    '既定': { th: 'ค่าเริ่มต้น', en: 'Default' },
    '拠点名・住所は必須です': { th: 'กรุณากรอกชื่อสาขาและที่อยู่ค่ะ', en: 'Site name and address are required.' },
    '例: 本社': { th: 'เช่น สำนักงานใหญ่', en: 'e.g. Head office' },
    '例: 123 Sukhumvit Rd, Bangkok': { th: 'เช่น 123 ถ.สุขุมวิท กรุงเทพฯ', en: 'e.g. 123 Sukhumvit Rd, Bangkok' },
    '例: 5F 受付': { th: 'เช่น ชั้น 5 จุดรับของ', en: 'e.g. 5F reception' },
    '例: 総務 山田': { th: 'เช่น ฝ่ายบุคคล คุณสมชาย', en: 'e.g. HR, Somchai' },
    '例: 平日 9:00-17:00': { th: 'เช่น จ-ศ 9:00-17:00', en: 'e.g. Mon-Fri 9:00-17:00' },

    // ---- 従業員 ----
    '従業員リスト': { th: 'รายชื่อพนักงาน', en: 'Employee list' },
    'まとめて登録したい場合は、リスト（Excel/CSV）をCAKEME事務局へお送りください。こちらで取り込みます。': { th: 'หากต้องการลงทะเบียนจำนวนมาก กรุณาส่งไฟล์รายชื่อ (Excel/CSV) มาที่ทีมงาน CAKEME เราจะนำเข้าให้ค่ะ', en: 'To register many at once, send your list (Excel/CSV) to the CAKEME team and we\'ll import it.' },
    'ニックネーム': { th: 'ชื่อเล่น', en: 'Nickname' },
    '表示名': { th: 'ชื่อที่แสดง', en: 'Display name' },
    '誕生日（月・日）': { th: 'วันเกิด (เดือน/วัน)', en: 'Birthday (month/day)' },
    '月': { th: 'เดือน', en: 'Month' },
    '日': { th: 'วัน', en: 'Day' },
    '入力は表示名と誕生日（月・日）だけです。': { th: 'กรอกเพียงชื่อที่แสดงและวันเกิด (เดือน/วัน) เท่านั้นค่ะ', en: 'Just enter the display name and birthday (month/day).' },
    '登録済み（': { th: 'ลงทะเบียนแล้ว (', en: 'Registered (' },
    '名）': { th: ' คน)', en: ')' },
    'リストに追加': { th: 'เพิ่มในรายการ', en: 'Add to list' },
    '本名でなくてOK（ニックネーム推奨）。生年は不要です。': { th: 'ไม่จำเป็นต้องเป็นชื่อจริง (แนะนำชื่อเล่น) ไม่ต้องระบุปีเกิดค่ะ', en: 'Real name not required (nickname recommended). Birth year not needed.' },
    '在籍off': { th: 'ไม่อยู่แล้ว', en: 'Inactive' },
    '復帰': { th: 'กลับมา', en: 'Reactivate' },
    '表示名・月(1-12)・日(1-31)を入力してください': { th: 'กรุณากรอกชื่อ, เดือน(1-12) และวัน(1-31) ค่ะ', en: 'Enter display name, month (1-12) and day (1-31).' },
    '追加分がありません': { th: 'ไม่มีรายการที่จะเพิ่มค่ะ', en: 'Nothing to add.' },
    '未保存': { th: 'ยังไม่บันทึก', en: 'Unsaved' },
    '{n}件を保存しました': { th: 'บันทึก {n} รายการแล้วค่ะ', en: 'Saved {n} entries' },
    '{n}件エラー: {detail}': { th: 'ผิดพลาด {n} รายการ: {detail}', en: '{n} errors: {detail}' },

    // ---- 履歴 ----
    '注文履歴': { th: 'ประวัติการสั่งซื้อ', en: 'Order history' },
    'すべて': { th: 'ทั้งหมด', en: 'All' },
    '状態': { th: 'สถานะ', en: 'Status' },
    '該当する注文はありません': { th: 'ไม่มีออเดอร์ที่ตรงกันค่ะ', en: 'No matching orders.' },
    '支払い待ち': { th: 'รอชำระเงิน', en: 'Awaiting payment' },
    '入金済み': { th: 'ชำระเงินแล้ว', en: 'Paid' },
    '未確定': { th: 'ยังไม่ยืนยัน', en: 'Draft' },
    '確定': { th: 'ยืนยันแล้ว', en: 'Confirmed' },
    '製造中': { th: 'กำลังทำ', en: 'Preparing' },
    '配達中': { th: 'กำลังจัดส่ง', en: 'Out for delivery' },
    '完了': { th: 'เสร็จสิ้น', en: 'Delivered' },
    'スキップ': { th: 'ข้าม', en: 'Skipped' },
    'キャンセルしました。「ケーキを選んで注文」から再注文できます': { th: 'ยกเลิกแล้วค่ะ สามารถสั่งใหม่ได้จาก "เลือกเค้กและสั่งซื้อ"', en: 'Cancelled. You can reorder from "Choose a cake & order".' },

    // ---- カタログ ----
    'ケーキメニュー': { th: 'เมนูเค้ก', en: 'Cake menu' },
    '現在ご注文いただけるデザイン一覧です。ご注文は、誕生日が近づいた際のお知らせからどうぞ。': { th: 'รายการดีไซน์ที่สั่งได้ในตอนนี้ค่ะ กรุณาสั่งซื้อจากการแจ้งเตือนเมื่อใกล้ถึงวันเกิดนะคะ', en: 'Designs available to order. Please order from the reminder as a birthday approaches.' },
    'フィリング読み込み中…': { th: 'กำลังโหลดไส้เค้ก…', en: 'Loading fillings…' },
    'メニュー準備中です': { th: 'กำลังเตรียมเมนูค่ะ', en: 'Menu coming soon' },
    '中身（フィリング）はどれでも選べます': { th: 'เลือกไส้เค้กได้ทุกแบบค่ะ', en: 'You can choose any filling' },

    // ---- 注文 ----
    '誕生日ケーキの注文': { th: 'สั่งเค้กวันเกิด', en: 'Order a birthday cake' },
    '配達先オフィス': { th: 'ออฟฟิศที่จัดส่ง', en: 'Delivery office' },
    '配達時間帯': { th: 'ช่วงเวลาจัดส่ง', en: 'Delivery time' },
    'お届け先・時間帯を確認': { th: 'ตรวจสอบที่จัดส่งและเวลา', en: 'Check delivery & time' },
    'ケーキを追加（タップで選択）': { th: 'เพิ่มเค้ก (แตะเพื่อเลือก)', en: 'Add a cake (tap to select)' },
    '下のケーキをタップして追加してください': { th: 'แตะเค้กด้านล่างเพื่อเพิ่มค่ะ', en: 'Tap a cake below to add it.' },
    '選んだケーキ': { th: 'เค้กที่เลือก', en: 'Selected cakes' },
    'ケーキを追加してください': { th: 'กรุณาเพิ่มเค้กค่ะ', en: 'Please add a cake.' },
    'ご要望・メッセージ（任意）': { th: 'คำขอเพิ่มเติม / ข้อความ (ถ้ามี)', en: 'Requests / message (optional)' },
    'ケーキに直接書くメッセージ、ろうそくの本数、アレルギー対応などをご記入ください。': { th: 'ระบุข้อความที่จะเขียนบนเค้ก จำนวนเทียน หรือเรื่องภูมิแพ้ ฯลฯ ได้ค่ะ', en: 'Note the message to write on the cake, number of candles, allergy needs, etc.' },
    '例）1つのケーキに「Happy Birthday ○○」とケーキに直接書いてください。ろうそくを5本つけてください。': { th: 'เช่น เขียน "Happy Birthday ___" บนเค้ก และใส่เทียน 5 เล่มค่ะ', en: 'e.g. Write "Happy Birthday ___" on the cake and add 5 candles.' },
    'サイズ': { th: 'ขนาด', en: 'Size' },
    'フィリング（中身）': { th: 'ไส้เค้ก', en: 'Filling' },
    '個数': { th: 'จำนวน', en: 'Quantity' },
    '{n}名': { th: '{n} คน', en: '{n} servings' },
    '{n}人': { th: '{n} คน', en: '{n} servings' },
    'カートに追加': { th: 'เพิ่มลงตะกร้า', en: 'Add to cart' },
    'カートに追加しました': { th: 'เพิ่มลงตะกร้าแล้วค่ะ', en: 'Added to cart' },
    'キャンセルしました': { th: 'ยกเลิกแล้วค่ะ', en: 'Cancelled' },
    '注文する': { th: 'สั่งซื้อ', en: 'Place order' },
    '変更を確定する': { th: 'ยืนยันการแก้ไข', en: 'Confirm changes' },
    'この注文をキャンセル': { th: 'ยกเลิกออเดอร์นี้', en: 'Cancel this order' },
    '確認内容と支払いQRをLINEにお送りしました。': { th: 'ส่งรายละเอียดและ QR ชำระเงินไปที่ LINE แล้วค่ะ', en: 'We\'ve sent the details and payment QR to your LINE.' },
    '注文が指定されていません': { th: 'ยังไม่ได้ระบุออเดอร์ค่ะ', en: 'No order specified.' },
    'この注文をキャンセルしますか？\nお支払い前なので、もう一度ご注文いただけます。': { th: 'ต้องการยกเลิกออเดอร์นี้ไหมคะ?\nยังไม่ได้ชำระเงิน จึงสามารถสั่งใหม่ได้ค่ะ', en: 'Cancel this order?\nIt\'s unpaid, so you can order again.' },
    '以上で配送料無料': { th: 'ขึ้นไป ส่งฟรี', en: 'or more: free delivery' },
    '1,500 THB以上で配送料無料': { th: 'สั่งครบ 1,500 บาทขึ้นไป ส่งฟรีค่ะ', en: 'Free delivery for orders of 1,500 THB or more' },
    '合計': { th: 'รวม', en: 'Total' },
    '（拠点未登録）': { th: '(ยังไม่มีสาขา)', en: '(No site registered)' },
    '(なし)': { th: '(ไม่มี)', en: '(none)' },
    // 動的（{var}で数値・名前を差し込む）
    '中身: {filling}': { th: 'ไส้: {filling}', en: 'Filling: {filling}' },
    '{name} さん / お届け {date}': { th: 'คุณ {name} / จัดส่ง {date}', en: '{name} / Delivery {date}' },
    '配達日: {date}（固定）': { th: 'วันจัดส่ง: {date} (กำหนดแล้ว)', en: 'Delivery date: {date} (fixed)' },
    '注文番号 {orderNo} / 合計 {total} THB': { th: 'เลขที่ออเดอร์ {orderNo} / รวม {total} บาท', en: 'Order No {orderNo} / Total {total} THB' },
    '注文を確定しました': { th: 'รับออเดอร์เรียบร้อยแล้วค่ะ 🎂', en: 'Your order is placed 🎂' },
    '注文を変更しました': { th: 'แก้ไขออเดอร์เรียบร้อยแล้วค่ะ 🎂', en: 'Your order has been updated 🎂' },
    '{name} さんの誕生日ケーキの注文は キャンセル済み です。': { th: 'ออเดอร์เค้กวันเกิดของคุณ {name} ถูกยกเลิกแล้วค่ะ', en: 'The birthday cake order for {name} has been cancelled.' },
    '{name} さんの誕生日ケーキは 今回スキップ されています。': { th: 'เค้กวันเกิดของคุณ {name} ถูกข้ามในครั้งนี้ค่ะ', en: 'The birthday cake for {name} was skipped this time.' },
    '既に {name} さんの誕生日ケーキは 注文済み です。': { th: 'เค้กวันเกิดของคุณ {name} ถูกสั่งไว้แล้วค่ะ', en: '{name}\'s birthday cake has already been ordered.' },

    // ---- 会社登録案内 ----
    'ご登録の手続き中です': { th: 'กำลังดำเนินการลงทะเบียนค่ะ', en: 'Registration in progress' },
    'ご登録ありがとうございます': { th: 'ขอบคุณสำหรับการลงทะเบียนค่ะ', en: 'Thank you for registering' },
    '会社の登録は CAKEME 側で行います。': { th: 'การลงทะเบียนบริษัทดำเนินการโดยทีม CAKEME ค่ะ', en: 'Company registration is handled by CAKEME.' },
    '担当者が登録の手続きを行います。少々お待ちください。': { th: 'เจ้าหน้าที่กำลังดำเนินการลงทะเบียนให้ กรุณารอสักครู่นะคะ', en: 'Our team is processing your registration. Please wait a moment.' },
    '担当者が登録を完了しましたら、こちらのLINEにご案内をお送りします。少々お待ちください。': { th: 'เมื่อเจ้าหน้าที่ลงทะเบียนเสร็จ เราจะแจ้งทาง LINE นี้ กรุณารอสักครู่นะคะ', en: 'Once registration is complete, we\'ll notify you here on LINE. Please wait.' },
    'お急ぎの場合や不明点は、CAKEME 担当者までご連絡ください。': { th: 'หากเร่งด่วนหรือมีข้อสงสัย กรุณาติดต่อเจ้าหน้าที่ CAKEME ค่ะ', en: 'If urgent or unclear, please contact the CAKEME team.' },
    '下のメニュー、または「メニュー」と送信すると各種登録ができます。': { th: 'ใช้เมนูด้านล่าง หรือพิมพ์ "เมนู" เพื่อจัดการการลงทะเบียนต่างๆ ได้ค่ะ', en: 'Use the menu below, or send "Menu" to manage your registrations.' },
    '従業員リストを登録': { th: 'ลงทะเบียนรายชื่อพนักงาน', en: 'Register employee list' },
    '配達先オフィスを登録': { th: 'ลงทะเบียนออฟฟิศจัดส่ง', en: 'Register delivery office' }
  };
  var ORIG_TEXT = new WeakMap();
  var ORIG_PH = new WeakMap();

  window.LANG = (function () { try { return localStorage.getItem('cakeme_lang') || 'th'; } catch (e) { return 'th'; } })();

  // JS内文字列用: t('日本語', {var:val}) → 現在言語の訳（未登録キーはそのまま）
  window.t = function (ja, vars) {
    var e = I18N[ja];
    var s = (e && e[window.LANG] != null) ? e[window.LANG] : ja;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]); });
    return s;
  };

  function lookup(key) {
    var e = I18N[key];
    if (!e) return null;
    var rep = (e[window.LANG] != null) ? e[window.LANG] : e.th;
    return (rep == null) ? null : rep;
  }
  // 先頭装飾（丸数字①②③・絵文字・＋−記号）＋空白の並び
  var DECO_RE = /^((?:[①-⑳]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDFFF]|[☀-➿⬀-⯿️]|[＋－−#•・►▶*])\s*)+/;
  function repl(orig) {
    var raw = String(orig);
    var key = raw.trim();
    if (!key) return null;
    // 1) 完全一致
    var r = lookup(key);
    if (r != null) return raw.replace(key, r);
    // 2) 先頭の装飾を剥がして本文だけで再マッチ（「① お届け先…」等）
    var m = key.match(DECO_RE);
    if (m) {
      var deco = m[0], body = key.slice(deco.length);
      var rb = lookup(body);
      if (rb != null) return raw.replace(key, deco + rb);
    }
    return null;
  }

  function translateTextNode(node) {
    var orig = ORIG_TEXT.has(node) ? ORIG_TEXT.get(node) : node.nodeValue;
    var out = repl(orig);
    if (out == null) return;
    if (!ORIG_TEXT.has(node)) ORIG_TEXT.set(node, orig);
    if (out !== node.nodeValue) node.nodeValue = out;
  }

  function translatePlaceholder(el) {
    var orig = ORIG_PH.has(el) ? ORIG_PH.get(el) : el.getAttribute('placeholder');
    if (orig == null) return;
    var out = repl(orig);
    if (out == null) return;
    if (!ORIG_PH.has(el)) ORIG_PH.set(el, orig);
    if (out !== el.getAttribute('placeholder')) el.setAttribute('placeholder', out);
  }

  function applyI18n(root) {
    root = root || document.body;
    if (!root) return;
    if (root.nodeType === 3) { translateTextNode(root); return; }
    if (root.querySelectorAll) {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      var nodes = [], n;
      while ((n = walker.nextNode())) nodes.push(n);
      nodes.forEach(translateTextNode);
      Array.prototype.forEach.call(root.querySelectorAll('[placeholder]'), translatePlaceholder);
      if (root.getAttribute && root.getAttribute('placeholder')) translatePlaceholder(root);
    }
  }
  window.applyI18n = applyI18n;

  window.setLang = function (lang) {
    window.LANG = (String(lang).toLowerCase() === 'en') ? 'en' : 'th';
    try { localStorage.setItem('cakeme_lang', window.LANG); } catch (e) {}
    applyI18n(document.body);
  };

  // 初回適用＋動的挿入ノードの自動翻訳（JSでinnerHTML生成した静的日本語も拾う）
  document.addEventListener('DOMContentLoaded', function () {
    applyI18n(document.body);
    try {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes, function (nd) {
            if (nd.nodeType === 1 || nd.nodeType === 3) applyI18n(nd);
          });
        });
      }).observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  });
})();
