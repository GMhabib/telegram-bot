// Pastikan Anda telah menambahkan library Lumpia ke proyek Google Apps Script Anda.
// ID library Lumpia: 1Yo6vQRwjG5Gl9jeEF0g2tBTUa0XN5MyT4G_HeDpRr9DvabxhRcSdhPNj
const BOT_TOKEN = 'BOT_TOKEN_KAMU'; // Ganti dengan token bot Anda
const WEBHOOK_URL = 'WEBHOOK_URL_KAMU'; // Ganti dengan URL aplikasi web Anda
const ADMIN_CHAT_IDS = [ADMIN_CHAT_IDS_KAMU]; // Ganti dengan ID chat admin (bisa lebih dari satu)
const BOT_USERNAME = '@USERNAME_BOT_KAMU'; // Ganti dengan username bot Anda (misalnya, 'nama_bot')
const SPAM_BOT_USERNAME = '@SpamBot'; // Username bot Telegram untuk memblokir pengguna
const MISS_ROSE_USERNAME = '@MissRose_bot'; // Username bot Telegram Miss Rose

const userConnections = PropertiesService.getUserProperties();
const blockedUsers = PropertiesService.getUserProperties(); // Properti untuk menyimpan daftar pengguna yang diblokir
const antiBanUsers = PropertiesService.getUserProperties(); // Properti untuk menyimpan daftar pengguna yang dilindungi dari ban
function initializeAdminChatIds() {
  const adminChatIds = [ADMIN_CHAT_IDS_KAMU]; // Ganti dengan ID chat admin Anda
  PropertiesService.getScriptProperties().setProperty('ADMIN_CHAT_IDS', JSON.stringify(adminChatIds));
  Logger.log('ID Chat Admin telah disimpan di Script Properties.');
}

function isAdmin(chatId) {
  return ADMIN_CHAT_IDS.includes(chatId);
}
function sendTelegramAdminMessage(message) {
  const adminChatIdsString = PropertiesService.getScriptProperties().getProperty('ADMIN_CHAT_IDS');
  if (adminChatIdsString) {
    const adminChatIds = JSON.parse(adminChatIdsString);
    adminChatIds.forEach(adminId => {
      sendMessage(adminId, message, 'HTML');
    });
  } else {
    Logger.log('Properti ADMIN_CHAT_IDS tidak ditemukan.');
  }
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
    const response = await UrlFetchApp.fetch(url, options);
    const jsonResponse = JSON.parse(response.getContentText());
    if (!jsonResponse.ok) {
      throw new Error(`Failed to delete message: ${JSON.stringify(jsonResponse)}`);
    }
  } catch (error) {
    Logger.error(`Error saat mencoba menghapus pesan ${messageId} di chat ${chatId}: ${error}`);
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
// **Anti Locked Forward dengan Auto Block & Kick Bot**
 //     if (contents.message.forward_from_chat && contents.message.forward_from_chat.has_protected_content) {
   //     try {
   //       const chatId = contents.message.chat.id;
      //    const messageId = contents.message.message_id;
    //      const userId = contents.message.from.id;

     //     await deleteMessage(chatId, messageId);
   //       Logger.log(`Pesan forward dari chat yang dilindungi dihapus: ${messageId} dari pengguna ${userId} di chat ${chatId}`);

   //       try {
            // Blokir pengguna yang mengirim forward terkunci
   //         await blockChatMember(chatId, userId);
    //        Logger.log(`Pengguna ${userId} diblokir karena mengirim forward dari chat yang dilindungi di chat ${chatId}`);

   //         try {
              // Keluarkan bot dari grup
     //         await leaveChat(chatId);
     //         Logger.log(`Bot dikeluarkan dari chat ${chatId} karena mendeteksi forward terkunci.`);
     //         return; // Hentikan pemrosesan lebih lanjut setelah bot keluar
   //         } catch (error) {
    //          Logger.error(`Gagal mengeluarkan bot dari chat ${chatId}: ${error}`);
      //        return; // Tetap hentikan pemrosesan meskipun gagal keluar
      //      }
     //     } catch (error) {
     //       Logger.error(`Gagal memblokir pengguna ${userId} di chat ${chatId}: ${error}`);
     //       return; // Tetap hentikan pemrosesan meskipun gagal memblokir
    //      }
   //     } catch (error) {
     //     Logger.error(`Gagal menghapus pesan forward dari chat yang dilindungi ${messageId}: ${error}`);
      //    return; // Tetap hentikan pemrosesan meskipun gagal menghapus
    //    }
    //  }
      // Filter kata kasar (hanya untuk pesan teks)
      if (text) {
        // **Tambahkan pengecekan format perintah bot sendiri di sini**
        const botCommandRegex = new RegExp(`^\\/\\w+${BOT_USERNAME.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');
        if (!botCommandRegex.test(text)) {
          const bannedWords = [
            /a+n+j+i+r+/i, /k+o+n+t+o+l+/i, /c+o+k+/i, /t+e+m+p+e+k+/i,
            /a+n+j+i+n+g+/i, /j+e+m+b+u+t+/i, /m+e+m+e+k+/i,
            ///a+s+u+/i,
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
      // Tambahkan kode untuk menghapus pesan perintah
        try {
          await deleteMessage(chatId, messageId);
          Logger.log(`Berhasil menghapus pesan perintah /start ${messageId} dari chat ${chatId}`);
        } catch (error) {
          Logger.log(`Gagal menghapus pesan perintah /start ${messageId}: ${error}`);
          // Mungkin bot tidak memiliki izin untuk menghapus pesan
          sendMessage(chatId, `⚠️ Gagal menghapus pesan perintah Anda. Pastikan bot memiliki izin yang cukup.`, 'HTML');
        }
      } else if (text.startsWith('/protect ')) {
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
                // Tambahkan kode untuk menghapus pesan perintah
        try {
          await deleteMessage(chatId, messageId);
          Logger.log(`Berhasil menghapus pesan perintah /protect ${messageId} dari chat ${chatId}`);
        } catch (error) {
          Logger.log(`Gagal menghapus pesan perintah /protect ${messageId}: ${error}`);
          // Mungkin bot tidak memiliki izin untuk menghapus pesan
          sendMessage(chatId, `⚠️ Gagal menghapus pesan perintah Anda. Pastikan bot memiliki izin yang cukup.`, 'HTML');
        }
      } else if (text === '/unprotect' && isAdmin(chatId)) {
        const protectedList = antiBanUsers.getProperty('protected_list');
        if (protectedList) {
          antiBanUsers.deleteProperty('protected_list');
          sendMessage(chatId, 'Semua pengguna telah dihapus dari daftar perlindungan anti-ban.', 'HTML');
          Logger.log(`Admin ${chatId} menghapus semua pengguna dari daftar perlindungan.`);
           // Tambahkan kode untuk menghapus pesan perintah yang tidak dikenali
            try {
              await deleteMessage(chatId, messageId);
              Logger.log(`Berhasil menghapus pesan tidak dikenal ${messageId} dari pengguna ${userId} di chat ${chatId}`);
            } catch (error) {
              Logger.log(`Gagal menghapus pesan tidak dikenal ${messageId}: ${error}`);
              // Mungkin bot tidak memiliki izin untuk menghapus pesan
              sendMessage(chatId, `⚠️ Gagal menghapus pesan Anda. Pastikan bot memiliki izin yang cukup.`, 'HTML');
            }
        } else {
          sendMessage(chatId, 'Daftar perlindungan anti-ban saat ini kosong.', 'HTML');
        }
      } else if (text === '/unprotect' && isAdmin(chatId)) {
        const protectedList = antiBanUsers.getProperty('protected_list');
        if (protectedList) {
          antiBanUsers.deleteProperty('protected_list');
          sendMessage(chatId, 'Semua pengguna telah dihapus dari daftar perlindungan anti-ban.', 'HTML');
          Logger.log(`Admin ${chatId} menghapus semua pengguna dari daftar perlindungan.`);
        } else {
          sendMessage(chatId, 'Daftar perlindungan anti-ban saat ini kosong.', 'HTML');
        }
      } else if (text.startsWith('/unprotect ')) {
        const target = text.substring('/unprotect '.length).trim();
        if (!isNaN(parseInt(target))) {
          const targetUserId = parseInt(target);
          if (targetUserId === userId) {
            if (unprotectUser(targetUserId)) {
              sendMessage(chatId, `Anda dengan ID <code>${targetUserId}</code> telah dihapus dari daftar perlindungan anti-ban.`, 'HTML');
            } else {
              sendMessage(chatId, `Anda dengan ID <code>${targetUserId}</code> tidak ditemukan dalam daftar perlindungan anti-ban.`, 'HTML');
            }
          } else if (isAdmin(chatId)) {
            if (unprotectUser(targetUserId)) {
              sendMessage(chatId, `Pengguna dengan ID <code>${targetUserId}</code> telah dihapus dari daftar perlindungan anti-ban.`, 'HTML');
            } else {
              sendMessage(chatId, `Pengguna dengan ID <code>${targetUserId}</code> tidak ditemukan dalam daftar perlindungan anti-ban.`, 'HTML');
            }
          } else {
            sendMessage(chatId, 'Maaf, hanya admin yang dapat menghapus pengguna lain dari daftar perlindungan.', 'HTML');
          }
        } else {
          sendMessage(chatId, 'Penggunaan perintah <code>/unprotect</code> yang benar adalah dengan membalas pesan pengguna atau menggunakan <code>/unprotect [ID Pengguna]</code>.', 'HTML');
        }
      } else if (text.startsWith('/thread ')) {
        const threadText = text.substring('/thread '.length).trim();
        if (threadText) {
          sendMessage(chatId, threadText, 'HTML'); // Kirim pesan sebagai bot
          Logger.log(`Pengguna ${userId} mengirim thread: ${threadText} di chat ${chatId}`);
          try {
            await deleteMessage(chatId, messageId); // Hapus pesan perintah
            Logger.log(`Berhasil menghapus pesan perintah ${messageId} dari pengguna ${userId} di chat ${chatId}`);
          } catch (error) {
            Logger.log(`Gagal menghapus pesan perintah ${messageId}: ${error}`);
            // Mungkin bot tidak memiliki izin untuk menghapus pesan
            sendMessage(chatId, `⚠️ Gagal menghapus pesan perintah Anda. Pastikan bot memiliki izin yang cukup.`, 'HTML');
          }
        } else {
          sendMessage(chatId, 'Penggunaan: <code>/thread [teks thread]</code>', 'HTML');
        }
      } else if (text === '/listprotect' && isAdmin(chatId)) {
        const protectedListMessage = getProtectedList(chatId);
        sendMessage(chatId, protectedListMessage, 'HTML');
    // Tambahkan kode untuk menghapus pesan perintah yang tidak dikenali
            try {
              await deleteMessage(chatId, messageId);
              Logger.log(`Berhasil menghapus pesan tidak dikenal ${messageId} dari pengguna ${userId} di chat ${chatId}`);
            } catch (error) {
              Logger.log(`Gagal menghapus pesan tidak dikenal ${messageId}: ${error}`);
              // Mungkin bot tidak memiliki izin untuk menghapus pesan
              sendMessage(chatId, `⚠️ Gagal menghapus pesan Anda. Pastikan bot memiliki izin yang cukup.`, 'HTML');
            }
      } else if (text.startsWith('/unblock ') && isAdmin(chatId)) {
        const target = text.substring('/unblock '.length).trim();
       // Tambahkan kode untuk menghapus pesan perintah yang tidak dikenali
            try {
              await deleteMessage(chatId, messageId);
              Logger.log(`Berhasil menghapus pesan tidak dikenal ${messageId} dari pengguna ${userId} di chat ${chatId}`);
            } catch (error) {
              Logger.log(`Gagal menghapus pesan tidak dikenal ${messageId}: ${error}`);
              // Mungkin bot tidak memiliki izin untuk menghapus pesan
              sendMessage(chatId, `⚠️ Gagal menghapus pesan Anda. Pastikan bot memiliki izin yang cukup.`, 'HTML');
            }
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
    // Tambahkan kode untuk menghapus pesan perintah yang tidak dikenali
            try {
              await deleteMessage(chatId, messageId);
              Logger.log(`Berhasil menghapus pesan tidak dikenal ${messageId} dari pengguna ${userId} di chat ${chatId}`);
            } catch (error) {
              Logger.log(`Gagal menghapus pesan tidak dikenal ${messageId}: ${error}`);
              // Mungkin bot tidak memiliki izin untuk menghapus pesan
              sendMessage(chatId, `⚠️ Gagal menghapus pesan Anda. Pastikan bot memiliki izin yang cukup.`, 'HTML');
            }
      } else {
        // Jika tidak ada perintah yang dikenali dan pengguna bukan admin
        if (!isAdmin(chatId)) {
          // Periksa apakah pengguna ada dalam daftar perlindungan
          if (!isProtected(userId)) {
            blockUser(userId);
            const reportMessage = `🚨 Pengguna Diblokir Otomatis 🚨\nPengguna ID: <code>${userId}</code>\nNama: ${firstName}\nUsername: ${chatUsername}\nChat ID: <code>${chatId}</code>\nTelah mengirimkan pesan yang tidak dikenali sebagai perintah.\nTindakan: Diblokir oleh bot. Disarankan untuk dilaporkan ke ${SPAM_BOT_USERNAME} dan ${MISS_ROSE_USERNAME}.`;
            sendTelegramAdminMessage(reportMessage);
            sendMessage(chatId, `silahkan buat perintah, /protect ${userId}. nanti kamu aman tidak terkena banned bot.`,'HTML');
            // Opsi untuk mencoba kick pengguna dari grup (jika dalam grup)
            if (chatType === 'group' || chatType === 'supergroup') {
              kickChatMember(chatId, userId);
            }
          } else {
            Logger.log(`Pengguna ${userId} mengirim pesan tidak dikenal tetapi dilindungi, tidak diblokir.`);
     //       sendMessage(chatId, `Pesan Anda tidak dikenali sebagai perintah yang valid.`);
          }
        } else {
          // Jika admin mengirim pesan yang tidak dikenali
          Logger.log(`Pesan tidak dikenali dari admin ${chatId}: ${text}`);
          // Tambahkan kode untuk menghapus pesan perintah yang tidak dikenali
            try {
              await deleteMessage(chatId, messageId);
              Logger.log(`Berhasil menghapus pesan tidak dikenal ${messageId} dari pengguna ${userId} di chat ${chatId}`);
            } catch (error) {
              Logger.log(`Gagal menghapus pesan tidak dikenal ${messageId}: ${error}`);
              // Mungkin bot tidak memiliki izin untuk menghapus pesan
              sendMessage(chatId, `⚠️ Gagal menghapus pesan Anda. Pastikan bot memiliki izin yang cukup.`, 'HTML');
            }
          sendMessage(chatId, 'Perintah tidak dikenali. Silakan coba perintah lain atau ketik /start untuk bantuan.', 'HTML');
        }
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
