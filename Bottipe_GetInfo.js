// Pastikan Anda telah menambahkan library Lumpia ke proyek Google Apps Script Anda.
// ID library Lumpia: 1Yo6vQRwjG5Gl9jeEF0g2tBTUa0XN5MyT4G_HeDpRr9DvabxhRcSdhPNj
// copy url ini https://sfl.gl/wOJmku
const BOT_TOKEN = 'BOT_TOKEN_KAMU'; // Ganti dengan token bot Anda
// copy url ini https://sfl.gl/iJ6BU
const WEBHOOK_URL = 'WEBHOOK_URL_KAMU'; // Ganti dengan URL aplikasi web Anda
// copy url ini https://sfl.gl/MHCHMRTr
const ADMIN_CHAT_IDS = [ADMIN_ID_KAMU]; // Ganti dengan ID chat admin (bisa lebih dari satu)
const BOT_USERNAME = '@USERNAME_BOT_KAMU'; // Ganti dengan username bot Anda (misalnya, 'nama_bot')
const SPAM_BOT_USERNAME = '@SpamBot'; // Username bot Telegram untuk memblokir pengguna
const MISS_ROSE_USERNAME = '@MissRose_bot'; // Username bot Telegram Miss Rose

const userConnections = PropertiesService.getUserProperties();
const blockedUsers = PropertiesService.getUserProperties(); // Properti untuk menyimpan daftar pengguna yang diblokir
const userCommandAttempts = PropertiesService.getUserProperties(); // Properti untuk melacak percobaan perintah pengguna
const antiBanUsers = PropertiesService.getUserProperties(); // Properti untuk menyimpan daftar pengguna yang dilindungi dari ban

const MAX_ID_COMMAND_ATTEMPTS = 2; // Batas percobaan perintah /id sebelum diblokir

function isAdmin(chatId) {
  return ADMIN_CHAT_IDS.includes(chatId);
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
        let connectionInfo = 'Tidak ada koneksi tersambung.';
        const connectedList = userConnections.getProperty(`admin_${chatId}_connections`);
        if (connectedList) {
          connectionInfo = JSON.parse(connectedList).join(', ');
        }

        const reply = `<b>Informasi Bot</b>\n` +
                      `<b>Admin ID:</b> <code>${chatId}</code>\n` +
                      `<b>Info Chat:</b>\n` +
                      `  <b>ID:</b> <code>${chatId}</code>\n` +
                      `  <b>Jenis:</b> <code>${chatType}</code>\n` +
                      `  <b>Username:</b> <code>${chatUsername}</code>\n` +
                      `<b>Koneksi Tersambung:</b> <code>${connectionInfo}</code>\n` +
                      `<b>Username Bot:</b> <code>${BOT_USERNAME}</code>\n` +
                      `<b>Jenis Bot:</b> Bot Biasa`;
        sendMessage(chatId, reply, 'HTML');
      } else if (text.startsWith('/protect ') && isAdmin(chatId)) {
        const parts = text.split(' ');
        if (parts.length === 2) {
          const target = parts[1].trim();
          let targetUserId = null;
          if (target.startsWith('@')) {
            // Tidak mungkin mendapatkan ID pengguna hanya dari username melalui bot API biasa.
            // Ini memerlukan penggunaan Telegram Bot API yang lebih kompleks atau library pihak ketiga
            // yang mungkin berinteraksi dengan API secara berbeda atau memiliki database username-ID.
            // Untuk kesederhanaan, kita akan memberitahu admin bahwa ini tidak didukung secara langsung.
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
      } else if (text === '/kirimid') {
        const connectedList = userConnections.getProperty(`admin_${chatId}_connections`);
        if (connectedList && JSON.parse(connectedList).length > 0) {
          sendMessage(chatId, `ID/Username yang saat ini terhubung adalah: <code>${JSON.parse(connectedList).join(', ')}</code>`, 'HTML');
        } else {
          sendMessage(chatId, `Admin <code>${chatId}</code> belum terhubung ke chat mana pun.`, 'HTML');
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

// Fungsi onOpen akan membuat menu kustom di Google Sheets
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Telegram Bot')
    .addItem('Set Webhook', 'setWebhook')
    .addItem('Delete Webhook', 'deleteWebhook')
    .addToUi();
}
