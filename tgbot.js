// Pastikan Anda telah menambahkan library Lumpia ke proyek Google Apps Script Anda.
// ID library Lumpia: 1Yo6vQRwjG5Gl9jeEF0g2tBTUa0XN5MyT4G_HeDpRr9DvabxhRcSdhPNj
// copy url ini https://sfl.gl/wOJmku
const BOT_TOKEN = 'BOT_TOKEN_KAMU'; // Ganti dengan token bot Anda
// copy url ini https://sfl.gl/iJ6BU
const WEBHOOK_URL = 'WEBHOOK_URL_KAMU'; // Ganti dengan URL aplikasi web Anda
// copy url ini https://sfl.gl/MHCHMRTr
const ADMIN_CHAT_IDS = [ADMIN_CHAT_IDS_KAMU]; // Ganti dengan ID chat admin (bisa lebih dari satu)
const BOT_USERNAME = '@USERNAME_BOT_KAMU'; // Ganti dengan username bot Anda (misalnya, 'nama_bot')
const SPAM_BOT_USERNAME = '@SpamBot'; // Username bot Telegram untuk memblokir pengguna
const MISS_ROSE_USERNAME = '@MissRose_bot'; // Username bot Telegram Miss Rose

const userConnections = PropertiesService.getUserProperties();
const blockedUsers = PropertiesService.getUserProperties(); // Properti untuk menyimpan daftar pengguna yang diblokir
const userCommandAttempts = PropertiesService.getUserProperties(); // Properti untuk melacak percobaan perintah pengguna
const antiBanUsers = PropertiesService.getUserProperties(); // Properti untuk menyimpan daftar pengguna yang dilindungi dari ban

const MAX_START_COMMAND_ATTEMPTS = Infinity; // Batas percobaan perintah /start sebelum diblokir (untuk non-admin)
const MAX_SETOWNER_COMMAND_ATTEMPTS = 1; // Batas percobaan perintah /setowner sebelum diblokir (untuk non-admin)
const MAX_LISTADMIN_COMMAND_ATTEMPTS = Infinity; // Batas percobaan perintah /listadmin sebelum diblokir (untuk non-admin)
const MAX_PROTECT_COMMAND_ATTEMPTS = Infinity; // Batas percobaan perintah /protect sebelum diblokir (untuk non-admin)
const MAX_UNPROTECT_COMMAND_ATTEMPTS = 1; // Batas percobaan perintah /unprotect sebelum diblokir (untuk non-admin)
const MAX_LISTPROTECT_COMMAND_ATTEMPTS = Infinity; // Batas percobaan perintah /listprotect sebelum diblokir (untuk non-admin)
const MAX_CONNECT_COMMAND_ATTEMPTS = 1; // Batas percobaan perintah /connect sebelum diblokir (untuk non-admin)
const MAX_CONNECTION_COMMAND_ATTEMPTS = Infinity; // Batas percobaan perintah /connection sebelum diblokir (untuk non-admin)
const MAX_DISCONNECT_COMMAND_ATTEMPTS = 1; // Batas percobaan perintah /disconnect sebelum diblokir (untuk non-admin)
const MAX_RECONNECT_COMMAND_ATTEMPTS = Infinity; // Batas percobaan perintah /reconnect sebelum diblokir (untuk non-admin)
const MAX_UNBLOCK_COMMAND_ATTEMPTS = Infinity; // Batas percobaan perintah /unblock sebelum diblokir (untuk non-admin)
const MAX_LISTBLOCK_COMMAND_ATTEMPTS = Infinity; // Batas percobaan perintah /listblock sebelum diblokir (untuk non-admin)
const MAX_THREAD_COMMAND_ATTEMPTS = Infinity; // Batas percobaan perintah /thread sebelum diblokir (untuk non-admin)

// Konfigurasi Admin dan Pemilik (Gunakan PropertiesService untuk penyimpanan yang lebih baik)
const adminConfig = PropertiesService.getScriptProperties();
const OWNER_ID_KEY = 'ownerId';
// const ADMINS_KEY = 'admins'; // Dihapus karena fungsi add/remove admin dihapus

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
  // const admins = adminConfig.getProperty(ADMINS_KEY); // Dihapus karena tidak digunakan lagi
  return ADMIN_CHAT_IDS.map(id => id.toString()); // Hanya menggunakan admin awal
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

async function deleteMessage(chatId, messageId) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`;
  const data = {
    chat_id: chatId,
    message_id: messageId
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
      Logger.log(`Pesan ${messageId} berhasil dihapus dari chat ${chatId}`);
      return true;
    } else {
      Logger.log(`Gagal menghapus pesan ${messageId} dari chat ${chatId}: ${JSON.stringify(jsonResponse)}`);
      return false;
    }
  } catch (error) {
    Logger.log(`Error saat mencoba menghapus pesan ${messageId} dari chat ${chatId}: ${error}`);
    return false;
  }
}

async function doPost(e) {
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
          // Tidak ada lagi pemblokiran untuk perintah /start
          let connectionInfo = 'Tidak ada koneksi tersambung.';
          const connectedList = userConnections.getProperty(`admin_${chatId}_connections`);
          if (connectedList) {
            connectionInfo = JSON.parse(connectedList).join(', ');
          }

          const reply = `<b>👋 Halo!</b>\n\n` +
            `<b>Informasi Bot</b>\n` +
            `<b>ID Anda:</b> <code>${userId}</code>\n` + // Menampilkan ID pengguna
            `<b>Info Chat Saat Ini:</b>\n` +
            `  <b>ID:</b> <code>${chatId}</code>\n` +
            `  <b>Jenis:</b> <code>${chatType}</code>\n` +
            `  <b>Username Grup/Channel:</b> <code>${chatUsername}</code>\n` +
            `<b>Koneksi Tersambung Admin:</b> <code>${connectionInfo}</code>\n` + // Informasi admin, jika ada
            `<b>Username Bot:</b> <code>${BOT_USERNAME}</code>\n` +
            `<b>Pemilik Bot:</b> <code>${getOwnerId() || 'Belum diatur'}</code>`;
          sendMessage(chatId, reply, 'HTML'); // Kirim ke chat tempat perintah dipanggil
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

      // Filter kata kasar (hanya untuk pesan teks)
      if (text) {
        // **Tambahkan pengecekan format perintah bot sendiri di sini**
        const botCommandRegex = new RegExp(`^\\/\\w+${BOT_USERNAME.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');
        if (!botCommandRegex.test(text)) {
          const bannedWords = [
            /a+n+j+i+r+/i, /k+o+n+t+o+l+/i, /c+o+k+/i, /t+e+m+p+e+k+/i,
            /a+n+j+i+n+g+/i, /j+e+m+b+u+t+/i, /m+e+m+e+k+/i, /a+s+u+/i,
            /p+u+k+i+/i, /j+a+n+c+o+k+/i, /c+u+o+k+/i, /a+s+w+u+/i, /a+s+w+/i,
            /w+u+a+s+w+u+/i, /k+u+o+n+t+o+l+/i, /j+u+e+m+b+o+t+/i, /u+a+n+j+i+r+/i,
            /m+u+e+k+i+/i, /m+u+e+m+e+k+/i, /k+u+n+t+u+l+/i,
            /c+u+k+i+m+a+y+/i, /t+a+i+/i, /t+a+e+k+/i, /j+u+w+e+m+b+o+t+/i,
            /m+e+k+i+/i, /c+u+k+/i, /j+a+n+c+u+k+/i, /a+j+i+n+k+/i, /a+n+j+u+/i,
            /w+u+a+n+j+a+y/i, /a+n+j+a+y+/i, /k+u+n+t+u+l+/i, /m+e+m+e+k+/i,

            // Tambahan kata kasar & umpatan umum Bahasa Indonesia
            /b+a+j+i+n+g+a+n+/i,
            /b+a+n+g+s+a+t+/i,
            /b+r+e+n+g+s+e+k+/i,
            /k+a+m+p+r+e+t+/i,
            /t+o+l+o+l+/i,
            /g+o+b+l+o+[gk]/i, // Bisa juga /g+o+b+l+o+[gk]/i untuk goblog/goblok
            /b+o+d+o+h+/i,
            /i+d+i+o+t+/i,
            /d+o+g+o+/i,
            /s+e+t+a+n+/i,
            /i+b+l+i+s+/i,
            /s+i+a+l+a+n+/i,
            /b+a+b+i+/i,
            /k+u+r+a+n+g+ +a+j+a+r+/i, // Frasa
            /n+g+e+n+t+o+t+/i, // Sangat vulgar
            /n+g+e+n+t+o+d/i, // Variasi
            /n+g+e+n+[t†]+[oóòôõöøōŏő]+[t†d]/i, // Regex lebih kompleks untuk variasi ngent*t/d
            /p+e+l+e+r+/i, // Vulgar
            /i+t+i+l+/i, // Vulgar
            /p+e+p+e+k+/i, // Vulgar (varian memek/puki)
            /p+e+c+u+n+/i, // Vulgar/kasar

            // Tambahan kata kasar Bahasa Inggris yang sering dipakai
            /f+u+c+k+/i,
            /f+a+k+/i, /f+u+q+/i, // Variasi
            /s+h+i+t+/i,
            /b+i+t+c+h+/i,
            /a+s+s+h+o+l+e+/i,
            /d+i+c+k+/i,
            /p+u+s+s+y+/i,
            /c+u+n+t+/i,
            /w+h+o+r+e+/i,
            /s+l+u+t+/i,
            /b+a+s+t+a+r+d+/i,
            /d+a+m+n+/i,
            /h+e+l+l+/i, // Mungkin terlaluumum? Pertimbangkan konteks.

            // Variasi lain dan typo
            /k+o+n+t+l+/i, // typo kontol
            /j+m+b+t+/i, // typo jembut
            /m+m+k+/i, // typo memek
            /j+n+c+k+/i, // typo jancok
            /b+n+g+s+t+/i, // typo bangsat
            /b+j+n+g+n+/i, // typo bajingan
          ];

          for (const word of bannedWords) {
            if (word.test(text)) {
              try {
                // Panggil fungsi deleteMessage dengan await dan tangkap error
                await deleteMessage(chatId, contents.message.message_id);
                Logger.log(`Deleted bad word message ${contents.message.message_id} from user ${contents.message.from.id} in chat ${chatId}`);
                return; // Hentikan proses jika pesan dihapus
              } catch (err) {
                Logger.log(`Failed to delete bad word message ${contents.message.message_id}: ${err.message}`);
                // Mungkin bot tidak punya hak akses delete atau pesan sudah dihapus
              }
            }
          }
        } else {
          Logger.log(`Pesan '${text}' cocok dengan format perintah bot sendiri, tidak akan dihapus.`);
        }
      }
    }
  } catch (error) {
    Logger.log('Error processing webhook:', error);
  }
  return ContentService.createTextOutput(JSON.stringify({ "method": "post" })).setMimeType(ContentService.MimeType.JSON);
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
