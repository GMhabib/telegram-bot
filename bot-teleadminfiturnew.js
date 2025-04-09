// Pastikan Anda sudah menambahkan library Lumpia ke script Google Apps Anda
// dengan Script ID: 1Yo6vQRwjG5Gl9jeEF0g2tBTUa0XN5MyT4G_HeDpRr9DvabxhRcSdhPNj

// masukkan TOKEN BOT dari BOT Father
// copy: https://sfl.gl/wOJmku
const token = '8005629037:AAEG2GnItMMh-SJRI9TjCegGbC7Z5550_oU'; // Ganti dengan token bot Anda

const bot = new lumpia.init(token);

// masukkan ID kamu, jika belum tau cek di @strukturbot
// kunjungi url: https://sfl.gl/e4dc
const adminBot = 7029813245; // Ganti dengan ID admin Anda

// jika debug true, akan mengirimkan struktur JSON ke admin bot
const debug = false;

// Variabel global untuk menyimpan status autoposting dan detailnya
let autoPostStatus = {
  enabled: false,
  chatId: null,
  message: null,
  triggerId: null // ID pemicu waktu untuk dihentikan
};

// Variabel global untuk menyimpan ID chat yang terhubung oleh admin
let connectedChatId = null;
const CONNECTED_CHAT_ID_PROPERTY = 'connectedChatId';

// Nama properti script untuk menyimpan status autoposting
const AUTO_POST_STATUS_PROPERTY = 'autoPostStatus';

// Fungsi untuk mendapatkan atau menyimpan properti script
function getScriptProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function setScriptProperty(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}

function deleteScriptProperty(key) {
  PropertiesService.getScriptProperties().deleteProperty(key);
}

// Fungsi untuk menyimpan status autoposting
function saveAutoPostStatus() {
  setScriptProperty(AUTO_POST_STATUS_PROPERTY, JSON.stringify(autoPostStatus));
  Logger.log(`Status Autoposting Disimpan: ${JSON.stringify(autoPostStatus)}`);
}

// Fungsi untuk memuat status autoposting saat script dijalankan
function loadAutoPostStatus() {
  const storedStatus = getScriptProperty(AUTO_POST_STATUS_PROPERTY);
  if (storedStatus) {
    try {
      autoPostStatus = JSON.parse(storedStatus);
      Logger.log(`Status Autoposting Dimuat: ${JSON.stringify(autoPostStatus)}`);
      // Jika autoposting aktif saat script dimuat, pastikan pemicunya berjalan
      if (autoPostStatus.enabled && autoPostStatus.chatId && !autoPostStatus.triggerId) {
        setupAutoPostTrigger();
      } else if (autoPostStatus.enabled && !autoPostStatus.chatId) {
        Logger.log("Peringatan: Autoposting aktif tetapi chatId tidak ditemukan saat memuat.");
        autoPostStatus.enabled = false;
        autoPostStatus.triggerId = null;
        saveAutoPostStatus();
      }
    } catch (e) {
      Logger.log(`Error parsing stored autoPostStatus: ${e}`);
      // Reset status jika ada error parsing
      autoPostStatus = { enabled: false, chatId: null, message: null, triggerId: null };
      saveAutoPostStatus();
    }
  } else {
    Logger.log("Tidak ada status autoposting tersimpan.");
  }

  // Load connected chat ID
  const storedConnectedChatId = getScriptProperty(CONNECTED_CHAT_ID_PROPERTY);
  if (storedConnectedChatId) {
    connectedChatId = storedConnectedChatId;
    Logger.log(`ID Chat Terhubung Dimuat: ${connectedChatId}`);
  } else {
    Logger.log("Tidak ada ID chat terhubung yang tersimpan.");
  }
}

// Panggil loadAutoPostStatus saat script pertama kali dijalankan
loadAutoPostStatus();
let lastAutoPostTime = 0;
const autoPostIntervalSeconds = 10;

function sendAutoPostMessage() {
  const currentTime = Math.floor(Date.now() / 1000); // Get current time in seconds

  if (autoPostStatus.enabled && autoPostStatus.chatId && autoPostStatus.message) {
    if (currentTime - lastAutoPostTime >= autoPostIntervalSeconds) {
      try {
        bot.telegram.sendMessage(autoPostStatus.chatId, autoPostStatus.message);
        Logger.log(`Autoposting dikirim ke chat ID: ${autoPostStatus.chatId}, Pesan: ${autoPostStatus.message}`);
        lastAutoPostTime = currentTime;
      } catch (error) {
        Logger.log(`Gagal mengirim autopost ke ${autoPostStatus.chatId}: ${error.message}`);
        stopAutoPosting(true, `⚠️ Autoposting dihentikan karena error saat mengirim pesan: ${error.message}`);
      }
    } else {
      Logger.log(`Autoposting skipped, less than ${autoPostIntervalSeconds} seconds since last post.`);
    }
  } else if (autoPostStatus.enabled) {
    Logger.log("Peringatan: Autoposting aktif tetapi chatId atau pesan tidak diatur.");
    stopAutoPosting(true, '⚠️ Autoposting dihentikan karena chatId atau pesan tidak valid.');
  }
}

// Fungsi untuk mengatur pemicu waktu autoposting
function setupAutoPostTrigger() {
  if (!autoPostStatus.chatId) {
    Logger.log("Error: Tidak dapat mengatur pemicu autoposting karena chatId tidak diatur.");
    bot.telegram.sendMessage(adminBot, '❌ Gagal mengaktifkan autoposting: chatId tidak valid.');
    return;
  }

  // Hapus pemicu yang mungkin sudah ada
  if (autoPostStatus.triggerId) {
    try {
      ScriptApp.deleteTrigger(ScriptApp.getProjectTriggers().find(trigger => trigger.getUniqueId() === autoPostStatus.triggerId));
      Logger.log(`Pemicu autoposting dengan ID ${autoPostStatus.triggerId} telah dihapus sebelum membuat yang baru.`);
      autoPostStatus.triggerId = null;
    } catch (e) {
      Logger.log(`Error menghapus pemicu lama: ${e}`);
      bot.telegram.sendMessage(adminBot, `⚠️ Gagal menghapus pemicu autoposting lama: ${e}`);
      return;
    }
  }

  try {
    // Buat pemicu baru
    const trigger = ScriptApp.newTrigger('sendAutoPostMessage')
      .timeBased()
      .everyMinutes(1)
      .create();

    autoPostStatus.enabled = true;
    autoPostStatus.triggerId = trigger.getUniqueId();
    saveAutoPostStatus();
    bot.telegram.sendMessage(autoPostStatus.chatId, '✅ Autoposting telah diaktifkan setiap 10 detik.');
    Logger.log(`Pemicu autoposting diatur dengan ID: ${autoPostStatus.triggerId} untuk chat ID: ${autoPostStatus.chatId}`);
  } catch (e) {
    Logger.log(`Error membuat pemicu autoposting: ${e}`);
    bot.telegram.sendMessage(adminBot, `❌ Gagal mengaktifkan autoposting: ${e}`);
    // Reset status jika gagal membuat pemicu
    autoPostStatus.enabled = false;
    autoPostStatus.triggerId = null;
    saveAutoPostStatus();
  }
}

// Fungsi untuk menghentikan autoposting
function stopAutoPosting(fromError = false, errorMessage = '') {
  if (autoPostStatus.enabled) {
    if (autoPostStatus.triggerId) {
      const triggerToDelete = ScriptApp.getProjectTriggers().find(trigger => trigger.getUniqueId() === autoPostStatus.triggerId);
      if (triggerToDelete) {
        try {
          ScriptApp.deleteTrigger(triggerToDelete);
          Logger.log(`Pemicu autoposting dengan ID ${autoPostStatus.triggerId} telah dihapus.`);
        } catch (e) {
          Logger.log(`Error menghapus pemicu: ${e}`);
          bot.telegram.sendMessage(adminBot, `⚠️ Error saat mencoba menghapus pemicu autoposting: ${e}`);
        }
      } else {
        Logger.log(`Pemicu autoposting dengan ID ${autoPostStatus.triggerId} tidak ditemukan.`);
        if (!fromError) {
          bot.telegram.sendMessage(adminBot, '⚠️ Pemicu autoposting tidak ditemukan.');
        }
      }
      autoPostStatus.triggerId = null;
    }

    autoPostStatus.enabled = false;
    autoPostStatus.chatId = null;
    autoPostStatus.message = null;
    saveAutoPostStatus();

    if (!fromError) {
      bot.telegram.sendMessage(adminBot, '🛑 Autoposting telah dihentikan.');
    } else if (errorMessage) {
      bot.telegram.sendMessage(adminBot, errorMessage);
    }
  } else {
    bot.telegram.sendMessage(adminBot, '⚠️ Autoposting belum diaktifkan.');
  }
}

// Fungsi untuk menyimpan ID chat yang terhubung
function saveConnectedChatId() {
  setScriptProperty(CONNECTED_CHAT_ID_PROPERTY, connectedChatId);
  Logger.log(`ID Chat Terhubung Disimpan: ${connectedChatId}`);
}

// Fungsi untuk menangani perintah /connect
function handleConnectCommand(chatId, messageId, text) {
  if (chatId !== adminBot) {
    bot.telegram.sendMessage(chatId, '🚫 Perintah ini hanya dapat digunakan oleh admin.', { reply_to_message_id: messageId });
    return;
  }

  const match = /^\/connect\s+(@?[-\d\w]+)$/i.exec(text);
  if (match && match[1]) {
    const targetChatIdentifier = match[1];
    let targetChatId = null;

    // Coba langsung gunakan jika berupa angka (ID)
    if (/^-?\d+$/.test(targetChatIdentifier)) {
      targetChatId = parseInt(targetChatIdentifier);
    } else if (/^@[\w]+$/.test(targetChatIdentifier)) {
      // Jika berupa username, kita perlu mendapatkan ID chatnya.
      // Namun, Telegram Bot API tidak langsung menyediakan cara untuk mendapatkan ID chat dari username
      // kecuali bot sudah berinteraksi dengan chat tersebut atau merupakan channel/group publik.
      // Untuk kesederhanaan, kita asumsikan admin memberikan ID yang valid atau username channel/group publik.
      targetChatId = targetChatIdentifier; // Kita simpan username, dan beberapa fungsi bot.telegram mungkin menerimanya.
      // Implementasi yang lebih robust mungkin memerlukan interaksi sebelumnya atau penggunaan API lain (jika ada).
    }

    if (targetChatId) {
      connectedChatId = targetChatId;
      saveConnectedChatId();
      bot.telegram.sendMessage(adminBot, `✅ Berhasil terhubung ke chat: <code>${targetChatIdentifier}</code>`, { parse_mode: 'HTML' });
    } else {
      bot.telegram.sendMessage(adminBot, '❌ Format ID atau username chat tidak valid. Gunakan ID chat atau @username.', { reply_to_message_id: messageId });
    }
  } else {
    bot.telegram.sendMessage(adminBot, '❌ Penggunaan: /connect <chatid/@username>', { reply_to_message_id: messageId });
  }
}

// Fungsi untuk menangani perintah /disconnect
function handleDisconnectCommand(chatId, messageId) {
  if (chatId !== adminBot) {
    bot.telegram.sendMessage(chatId, '🚫 Perintah ini hanya dapat digunakan oleh admin.', { reply_to_message_id: messageId });
    return;
  }

  if (connectedChatId !== null) {
    const previousChatId = connectedChatId;
    connectedChatId = null;
    deleteScriptProperty(CONNECTED_CHAT_ID_PROPERTY);
    bot.telegram.sendMessage(adminBot, `✅ Berhasil memutuskan koneksi dari chat: <code>${previousChatId}</code>`, { parse_mode: 'HTML' });
  } else {
    bot.telegram.sendMessage(adminBot, '⚠️ Tidak ada chat yang terhubung saat ini.', { reply_to_message_id: messageId });
  }
}

// Fungsi untuk menangani perintah /reconnect
function handleReconnectCommand(chatId, messageId) {
  if (chatId !== adminBot) {
    bot.telegram.sendMessage(chatId, '🚫 Perintah ini hanya dapat digunakan oleh admin.', { reply_to_message_id: messageId });
    return;
  }

  const storedConnectedChatId = getScriptProperty(CONNECTED_CHAT_ID_PROPERTY);
  if (storedConnectedChatId) {
    connectedChatId = storedConnectedChatId;
    bot.telegram.sendMessage(adminBot, `✅ Berhasil terhubung kembali ke chat sebelumnya: <code>${connectedChatId}</code>`, { parse_mode: 'HTML' });
  } else {
    bot.telegram.sendMessage(adminBot, '⚠️ Tidak ada ID chat yang tersimpan untuk dihubungkan kembali.', { reply_to_message_id: messageId });
  }
}

// Fungsi untuk menangani perintah /connection
function handleConnectionCommand(chatId, messageId) {
  if (chatId !== adminBot) {
    bot.telegram.sendMessage(chatId, '🚫 Perintah ini hanya dapat digunakan oleh admin.', { reply_to_message_id: messageId });
    return;
  }

  if (connectedChatId !== null) {
    bot.telegram.sendMessage(adminBot, `🔗 Saat ini terhubung ke chat dengan ID/Username: <code>${connectedChatId}</code>`, { parse_mode: 'HTML' });
  } else {
    bot.telegram.sendMessage(adminBot, '🔌 Saat ini tidak terhubung ke chat mana pun.', { reply_to_message_id: messageId });
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Bot Ini Adalah Milik habibGM");
}

function doPost(e) {
  try {
    let update = JSON.parse(e.postData.contents);

    if (debug && update?.message?.from?.id === adminBot) { // Hanya kirim debug jika dari admin
      bot.telegram.sendMessage(adminBot, JSON.stringify(update, null, 2));
      // Pertimbangkan apakah ingin menghentikan proses saat debug
      // return; // Uncomment jika ingin HANYA debug tanpa proses pesan
    }

    prosesPesan(update);

  } catch (error) {
    Logger.log("Error in doPost: " + error.message + "\nStack: " + error.stack);
    // Hindari mengirim error ke admin untuk setiap kesalahan kecil, kecuali error kritis
    // bot.telegram.sendMessage(adminBot, "Error in doPost: " + error.message);
  }
}

// --- Fungsi RSS Feed ---
function generateRssFeed() {
  try {
    var url = 'https://hat.loveslife.biz/rss.php?action=generate';
    var options = {
      'method': 'get',
      'muteHttpExceptions': true // Mencegah script berhenti jika ada error HTTP
    };
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseBody = response.getContentText();

    if (responseCode === 200) {
      Logger.log('Berhasil memicu pembuatan RSS feed. Respons: ' + responseBody);
    } else {
      Logger.log('Gagal memicu pembuatan RSS feed. Kode status: ' + responseCode + '. Respons: ' + responseBody);
    }

  } catch (error) {
    Logger.log('Terjadi kesalahan saat memicu pembuatan RSS feed: ' + error.toString());
  }
}

function setupTrigger() {
  // Hapus semua pemicu yang ada untuk fungsi ini (opsional, mencegah duplikat)
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'generateRssFeed') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Buat pemicu untuk menjalankan fungsi generateRssFeed setiap jam
  ScriptApp.newTrigger('generateRssFeed')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('Pemicu untuk generateRssFeed telah diatur untuk berjalan setiap jam.');
}

function deleteTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  var deletedCount = 0;
  for (var i = 0; i < triggers.length; i++) {
    // Hapus semua trigger, atau filter berdasarkan handler function jika perlu
    ScriptApp.deleteTrigger(triggers[i]);
    deletedCount++;
    // if (triggers[i].getHandlerFunction() === 'generateRssFeed') {
    //   ScriptApp.deleteTrigger(triggers[i]);
    //   deletedCount++;
    // }
  }
  Logger.log(deletedCount + ' pemicu telah dihapus.');
}
// --- Akhir Fungsi RSS Feed ---


// fungsi utama untuk memproses segala pesan yang masuk
function prosesPesan(update) {
  try {
    // deteksi tipe message
    if (update.message) {
      var msg = update.message;
      var chatId = msg.chat.id;
      var userId = msg.from.id;
      var messageId = msg.message_id;
      var messageText = msg.text || msg.caption; // Tangani teks dari pesan biasa atau caption media
      var isBot = msg.from.is_bot;
      var currentTime = new Date().getTime();
      var userKey = `${chatId}_${userId}`; // Kunci unik per user per chat

      // Abaikan pesan dari bot lain untuk mencegah loop atau spam bot
      if (isBot) {
        return;
      }

      // --- Filter & Deletion Logic ---

      // Filter kata kasar (hanya untuk pesan teks)
      if (messageText) {
        // Daftar kata-kata yang dilarang (termasuk variasi dan typo umum)
        // Dibuat case-insensitive dengan flag /i
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
          /n+g+e+n+t+o+t/i, // Sangat vulgar
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

        // Normalisasi teks (opsional, bisa membantu menangkap lebih banyak variasi)
        // Misalnya: hilangkan tanda baca, ubah ke lowercase
        const normalizedMessageText = messageText.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");

        for (const word of bannedWords) {
          // Uji pada teks yang sudah dinormalisasi jika Anda melakukan normalisasi
          // if (word.test(normalizedMessageText)) {
          // Atau uji pada teks asli:
          if (word.test(messageText)) {
            try {
              // Anda mungkin ingin memberitahu pengguna mengapa pesannya dihapus (opsional)
              // bot.telegram.sendMessage(chatId, `Pesan dari @${message.from.username} dihapus karena mengandung kata terlarang.`);

              bot.telegram.deleteMessage(chatId, messageId);
              Logger.log(`Deleted bad word message ${messageId} from user ${userId} in chat ${chatId}`);
              return; // Hentikan proses jika pesan dihapus
            } catch (err) {
              Logger.log(`Failed to delete bad word message ${messageId}: ${err.message}`);
              // Mungkin bot tidak punya hak akses delete atau pesan sudah dihapus
            }
          }
        }
      }
      // Filter media berdasarkan ukuran
      if (msg.photo) {
        const largestPhoto = msg.photo[msg.photo.length - 1];
        const fileSizeInMB = largestPhoto.file_size / (1024 * 1024);
        if (fileSizeInMB > 8) { // Batas 8 MB untuk foto
          try {
            bot.telegram.deleteMessage(chatId, messageId);
            Logger.log(`Deleted large photo message ${messageId} (${fileSizeInMB.toFixed(2)} MB) from user ${userId} in chat ${chatId}`);
            return; // Hentikan proses
          } catch (err) {
            Logger.log(`Failed to delete large photo ${messageId}: ${err.message}`);
          }
        }
      //  return bot.telegram.deleteMessage(msg.chat.id, msg.message_id);
      } else if (msg.video) {
        const fileSizeInMB = msg.video.file_size / (1024 * 1024);
        if (fileSizeInMB > 80) { // Batas 80 MB untuk video
          try {
            bot.telegram.deleteMessage(chatId, messageId);
            Logger.log(`Deleted large video message ${messageId} (${fileSizeInMB.toFixed(2)} MB) from user ${userId} in chat ${chatId}`);
            return; // Hentikan proses
          } catch (err) {
            Logger.log(`Failed to delete large video ${messageId}: ${err.message}`);
          }
        }
        return bot.telegram.deleteMessage(msg.chat.id, msg.message_id);
      }
      // Tambahkan filter lain di sini jika perlu (dokumen, audio, dll.)


      // --- Anti-Flood & Anti-Spam (Hanya untuk pesan dengan teks) ---
      // if (messageText) {
      //     // -- Anti-flood check --
      //     const wordCount = messageText.trim().split(/\s+/).length;
      //     if (wordCount >= floodThreshold && lastMessageTime[userKey] && currentTime - lastMessageTime[userKey] <= floodInterval) {
      //         userMessageCount[userKey] = (userMessageCount[userKey] || 0) + 1;
      //     } else if (wordCount >= floodThreshold) {
      //         userMessageCount[userKey] = 1; // Reset count jika interval terlewati atau pesan memenuhi batas kata
      //     } else {
      //         delete userMessageCount[userKey]; // Hapus jika tidak memenuhi batas kata
      //     }
      //     lastMessageTime[userKey] = currentTime;

      //     if (userMessageCount[userKey] >= 1) { // Jika sudah terdeteksi flood (1 kali saja cukup karena langsung dihapus)
      //         try {
      //             bot.telegram.deleteMessage(chatId, messageId);
      //             Logger.log(`Deleted FLOOD message ${messageId} (>= ${floodThreshold} words in ${floodInterval}ms) from user ${userId} in chat ${chatId}`);
      //             delete userMessageCount[userKey]; // Reset hitungan flood setelah dihapus
      //             delete lastMessageTime[userKey];
      //             return; // Hentikan pemrosesan
      //         } catch (err) {
      //             Logger.log(`Failed to delete flood message ${messageId}: ${err.message}`);
      //         }
      //     }

      //     // -- Deteksi pesan berulang (repeated) --
      //     if (!userLastMessages[userKey]) {
      //         userLastMessages[userKey] = [];
      //     }
      //     // Bersihkan pesan lama
      //     userLastMessages[userKey] = userLastMessages[userKey].filter(item => currentTime - item.timestamp < duplicateMessageInterval);
      //     // Tambah pesan baru
      //     userLastMessages[userKey].push({ timestamp: currentTime, text: messageText, messageId: messageId });
      //     // Hitung duplikat
      //     const duplicateCount = userLastMessages[userKey].filter(item => item.text === messageText).length;

      //     if (duplicateCount >= duplicateMessageThreshold) {
      //         // Hapus semua pesan duplikat dalam interval waktu
      //         const messagesToDelete = userLastMessages[userKey].filter(item => item.text === messageText);
      //         messagesToDelete.forEach(item => {
      //             try {
      //                 bot.telegram.deleteMessage(chatId, item.messageId);
      //                 Logger.log(`Deleted REPEATED message ${item.messageId} from user ${userId} in chat ${chatId}`);
      //             } catch (err) {
      //                 Logger.log(`Failed to delete repeated message ${item.messageId}: ${err.message}`);
      //             }
      //         });
      //         // Bersihkan pesan yang sudah dihapus dari history user
      //         userLastMessages[userKey] = userLastMessages[userKey].filter(item => item.text !== messageText);
      //         return; // Hentikan pemrosesan
      //     }


      //     // -- Deteksi pesan berurutan yang sama (consecutive) --
      //      if (!userConsecutiveMessages[userKey]) {
      //          userConsecutiveMessages[userKey] = { lastText: null, count: 0, messageIds: [] };
      //      }
      //      const consecutiveData = userConsecutiveMessages[userKey];

      //      if (messageText === consecutiveData.lastText) {
      //          consecutiveData.count++;
      //          consecutiveData.messageIds.push(messageId);

      //          if (consecutiveData.count >= consecutiveDuplicateThreshold) {
      //              // Hapus semua pesan berurutan yang sama (termasuk yang ini)
      //              consecutiveData.messageIds.forEach(id => {
      //                  try {
      //                      bot.telegram.deleteMessage(chatId, id);
      //                       Logger.log(`Deleted CONSECUTIVE message ${id} from user ${userId} in chat ${chatId}`);
      //                  } catch (err) {
      //                       Logger.log(`Failed to delete consecutive message ${id}: ${err.message}`);
      //                  }
      //              });
      //              // Reset setelah menghapus
      //              consecutiveData.lastText = null;
      //              consecutiveData.count = 0;
      //              consecutiveData.messageIds = [];
      //              return; // Hentikan pemrosesan
      //          }
      //      } else {
      //          // Pesan berbeda, reset state
      //          consecutiveData.lastText = messageText;
      //          consecutiveData.count = 1;
      //          consecutiveData.messageIds = [messageId];
      //      }
      // } // End Anti-Flood/Spam Check

      // --- Command & Keyword Processing (Hanya jika pesan berupa text) ---
      if (messageText) {
        var text = messageText; // Gunakan variabel 'text' agar lebih jelas
        var from = msg.from;
        var nama = from.first_name + (from.last_name ? ' ' + from.last_name : '');
        var cocok; // Untuk hasil regex exec

        // Command: /start
        if (/^\/start$/i.test(text)) {
          var pesan = `🙋🏽 Halo, <b>${htmlEntities(nama)}</b>, perkenalkan aku ini bot!`;
          pesan += `\n🎁 Dibuat dengan <b>GAS Library Lumpia</b>`; // Versi library mungkin tidak tersedia langsung di bot.telegram
          pesan += "\n\n💁🏻‍♀️ Bergabunglah di @eeksenyum untuk silaturrahim dan belajar bersama membuat bot Telegram.";
          var keyboard = [
            [{ text: '😎 habibGM Website', url: 'https://sfl.gl/bxz4SzyQ' }, { text: '📚 eeksenyum channel', url: 'https://t.me/eeksenyumchannel' }],
            [{ text: '👥 @eeksenyum', url: 'https://t.me/eeksenyum' }],
            [{ text: '😼 Perintah Bot', callback_data: 'menu_click' }]
          ];
          bot.telegram.sendMessage(chatId, pesan, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
          return; // Penting untuk menghentikan proses setelah command
        }

        // Command: /postingan
        var polaPostingan = /\/postingan/i;
        if (polaPostingan.exec(msg.text)) {
          try {
            var response = UrlFetchApp.fetch('http://hat.loveslife.biz/rss.xml');
            var xml = XmlService.parse(response.getContentText());
            var items = xml.getRootElement().getChild('channel').getChildren('item');
            var pesanAwal = "<b>Postingan Terbaru dari Habib Blog:</b>\n\n";
            pesanAwal += "Silakan buka tautan berikut dengan Telegram untuk membaca:\n\n";

            // Kirim pesan awal
            bot.telegram.sendMessage(msg.chat.id, pesanAwal, { parse_mode: 'HTML' });

            // Batasi jumlah postingan yang ditampilkan
            var jumlahPostingan = Math.min(9, items.length);

            for (var i = 0; i < jumlahPostingan; i++) {
              var item = items[i];
              var title = item.getChildText('title');
              var link = item.getChildText('link');
              var pesanLink = `➡️ <a href="${link}"><b>${htmlEntities(title)}</b></a>`;
              bot.telegram.sendMessage(msg.chat.id, pesanLink, { parse_mode: 'HTML' });
            }

            var pesanAkhir = "\nSelengkapnya di http://hat.loveslife.biz";
            return bot.telegram.sendMessage(msg.chat.id, pesanAkhir, { parse_mode: 'HTML' });

          } catch (error) { 
            return bot.telegram.sendMessage(msg.chat.id, `❌ Gagal mengambil atau memproses postingan: ${error.message}`);
          }
        }
        // Command: /usercek (Harus reply ke pesan user)
        if (/^\/usercek$/i.test(text)) {
          if (msg.reply_to_message) {
            var repliedUser = msg.reply_to_message.from;
            var repliedUserId = repliedUser.id;
            var repliedUserName = repliedUser.first_name + (repliedUser.last_name ? ' ' + repliedUser.last_name : '');
            var repliedUserUsername = repliedUser.username ? `@${repliedUser.username}` : '(tidak ada username)';
            var response = `ℹ️ Info Pengguna (dari pesan balasan):\n`;
            response += `- Nama: ${htmlEntities(repliedUserName)}\n`;
            response += `- User ID: <code>${repliedUserId}</code>\n`;
            response += `- Username: ${repliedUserUsername}\n`;
            response += `- Apakah Bot? ${repliedUser.is_bot ? 'Ya' : 'Tidak'}`;
            bot.telegram.sendMessage(chatId, response, { parse_mode: 'HTML', reply_to_message_id: messageId });
          } else {
            bot.telegram.sendMessage(chatId, "⚠️ Perintah ini harus digunakan dengan membalas (reply) pesan pengguna yang ingin dicek.", { reply_to_message_id: messageId });
          }
          return;
        }

        // Command: /ban (Membutuhkan ID pengguna)
        var polaBan = /^\/ban (\d+)(?:\s+(.*))?$/i; // Match /ban <userid> [alasan]
        if (cocok = polaBan.exec(text)) {
          var userIdToBan = parseInt(cocok[1]);
          var reason = cocok[2] ? cocok[2].trim() : 'Tidak ada alasan spesifik.';

          // Cek apakah user mencoba ban diri sendiri atau bot
          if (userIdToBan === userId) {
            bot.telegram.sendMessage(chatId, "Anda tidak bisa mem-ban diri sendiri.", { reply_to_message_id: messageId });
            return;
          }
          if (userIdToBan === bot.telegram.getMe().id) { // Perlu cara mendapatkan ID bot, misal dari getMe() saat init
            bot.telegram.sendMessage(chatId, "Saya tidak bisa mem-ban diri saya sendiri.", { reply_to_message_id: messageId });
            return;
          }

          try {
            // Cek apakah pengguna yang memerintah adalah admin? (Implementasi sederhana)
            var chatMember = bot.telegram.getChatMember(chatId, userId);
            if (chatMember.status !== 'creator' && chatMember.status !== 'administrator') {
              bot.telegram.sendMessage(chatId, "Hanya admin yang bisa menggunakan perintah ini.", { reply_to_message_id: messageId });
              return;
            }

            var banResult = bot.telegram.banChatMember(chatId, userIdToBan); // Metode mungkin berbeda di Lumpia, cek dokumentasi
            if (banResult.ok) { // Asumsi hasil memiliki properti 'ok'
              bot.telegram.sendMessage(chatId, `✅ Pengguna dengan ID <code>${userIdToBan}</code> berhasil dibanned.\nAlasan: ${htmlEntities(reason)}`, { parse_mode: 'HTML' });
              Logger.log(`User ${userIdToBan} banned by ${userId} in chat ${chatId}. Reason: ${reason}`);
            } else {
              bot.telegram.sendMessage(chatId, `❌ Gagal memban pengguna ID <code>${userIdToBan}</code>.\nError: ${banResult.description || 'Unknown error'}`, { parse_mode: 'HTML' });
              Logger.log(`Failed to ban user ${userIdToBan} by ${userId} in chat ${chatId}. Error: ${banResult.description}`);
            }
          } catch (error) {
            bot.telegram.sendMessage(chatId, `❌ Terjadi kesalahan saat mencoba memban pengguna ID <code>${userIdToBan}</code>: ${error.message}`, { parse_mode: 'HTML' });
            Logger.log(`Exception during ban command for ${userIdToBan} by ${userId} in chat ${chatId}: ${error.message}`);
            // Pastikan bot adalah admin dengan hak ban
          }
          return;
        }

        // Command: /unban (Membutuhkan ID pengguna)
        var polaUnban = /^\/unban (\d+)$/i; // Match /unban <userid>
        if (cocok = polaUnban.exec(text)) {
          var userIdToUnban = parseInt(cocok[1]);
          try {
            // Cek apakah pengguna yang memerintah adalah admin? (Implementasi sederhana)
            var chatMember = bot.telegram.getChatMember(chatId, userId);
            if (chatMember.status !== 'creator' && chatMember.status !== 'administrator') {
              bot.telegram.sendMessage(chatId, "Hanya admin yang bisa menggunakan perintah ini.", { reply_to_message_id: messageId });
              return;
            }
            var unbanResult = bot.telegram.unbanChatMember(chatId, userIdToUnban); // Metode mungkin berbeda
            if (unbanResult.ok) {
              bot.telegram.sendMessage(chatId, `✅ Pengguna dengan ID <code>${userIdToUnban}</code> berhasil di-unban.`, { parse_mode: 'HTML' });
              Logger.log(`User ${userIdToUnban} unbanned by ${userId} in chat ${chatId}.`);
            } else {
              bot.telegram.sendMessage(chatId, `❌ Gagal meng
unban pengguna ID <code>${userIdToUnban}</code>.\nError: ${unbanResult.description || 'Unknown error'}`, { parse_mode: 'HTML' });
              Logger.log(`Failed to unban user ${userIdToUnban} by ${userId} in chat ${chatId}. Error: ${unbanResult.description}`);
            }
          } catch (error) {
            bot.telegram.sendMessage(chatId, `❌ Terjadi kesalahan saat mencoba meng-unban pengguna ID <code>${userIdToUnban}</code>: ${error.message}`, { parse_mode: 'HTML' });
            Logger.log(`Exception during unban command for ${userIdToUnban} by ${userId} in chat ${chatId}: ${error.message}`);
            // Pastikan bot adalah admin dengan hak ban
          }
          return;
        }
        // Command: /short <URL> [alias]
        var polaShort = /^\/short\s+(https?:\/\/[^\s]+)(?:\s+([a-zA-Z0-9_-]+))?$/i;
        if (cocok = polaShort.exec(text)) {
          var originalUrl = cocok[1];
          var alias = cocok[2];
          var apiUrl = 'https://safelinku.com/api/v1/links';
          // kunjungi url: https://safelinku.com/ref/habibG5
          var apiToken = '4f16abec4ee00d334e0d135f45714809b688016e'; // ⚠️ GANTI DENGAN API TOKEN SAFELINKU ANDA

          var payload = {
            'url': originalUrl
          };

          if (alias) {
            payload['alias'] = alias;
          }

          var options = {
            'method': 'post',
            'headers': {
              'Authorization': 'Bearer ' + apiToken,
              'Content-Type': 'application/json'
            },
            'payload': JSON.stringify(payload),
            'muteHttpExceptions': true // Agar tidak melempar error saat status bukan 200
          };

          bot.telegram.sendMessage(chatId, '⏳ Sedang memproses URL...', { reply_to_message_id: messageId });

          try {
            var response = UrlFetchApp.fetch(apiUrl, options);
            var responseCode = response.getResponseCode();
            var responseBody = response.getContentText();
            var jsonResponse = JSON.parse(responseBody);

            if (responseCode === 201) {
              bot.telegram.sendMessage(chatId, `🔗 URL pendek: ${jsonResponse.url}`, { reply_to_message_id: messageId });
              Logger.log(`URL berhasil dipendekkan: ${originalUrl} -> ${jsonResponse.url} (Alias: ${alias || 'tidak ada'})`);
            } else if (responseCode === 400) {
              bot.telegram.sendMessage(chatId, `❌ Permintaan tidak valid. Pastikan URL benar.`, { reply_to_message_id: messageId });
              Logger.log(`Error memendekkan URL (${responseCode}): ${responseBody}`);
            } else if (responseCode === 401) {
              bot.telegram.sendMessage(chatId, `🚫 Tidak diotorisasi. Periksa kembali API token Anda.`, { reply_to_message_id: messageId });
              Logger.log(`Error otorisasi (${responseCode}): ${responseBody}`);
            } else if (responseCode === 429) {
              bot.telegram.sendMessage(chatId, `⚠️ Rate limit terlampaui. Coba lagi nanti.`, { reply_to_message_id: messageId });
              Logger.log(`Rate limit terlampaui (${responseCode}): ${responseBody}`);
            } else {
              bot.telegram.sendMessage(chatId, `❌ Gagal memendekkan URL. Kode error: ${responseCode}`, { reply_to_message_id: messageId });
              Logger.log(`Error tidak dikenal (${responseCode}): ${responseBody}`);
            }

          } catch (error) {
            bot.telegram.sendMessage(chatId, `❌ Terjadi kesalahan saat memproses permintaan short URL: ${error.message}`, { reply_to_message_id: messageId });
            Logger.log(`Exception saat memproses short URL: ${error.message}\nStack: ${error.stack}`);
          }
          return; // Hentikan proses setelah memproses command /short
        }

        // Command: /autoposting <pesan>
        var polaAutoposting = /^\/autoposting\s+(.+)$/i;
        if (cocok = polaAutoposting.exec(text)) {
          if (userId === adminBot) { // Hanya admin yang boleh mengatur autoposting
            const pesanAutopost = cocok[1].trim();
            autoPostStatus.chatId = chatId; // Set chat ID saat perintah dipanggil
            autoPostStatus.message = pesanAutopost;
            setupAutoPostTrigger();
            bot.telegram.sendMessage(chatId, `✅ Autoposting akan dimulai dengan pesan: "${htmlEntities(pesanAutopost)}" setiap 10 detik di chat ini.`, { parse_mode: 'HTML' });
          } else {
            bot.telegram.sendMessage(chatId, '🚫 Perintah ini hanya dapat digunakan oleh admin.', { reply_to_message_id: messageId });
          }
          return;
        }

        // Command: /stopautoposting
        if (/^\/stopautoposting$/i.test(text)) {
          if (userId === adminBot) { // Hanya admin yang boleh menghentikan autoposting
            stopAutoPosting();
          } else {
            bot.telegram.sendMessage(chatId, '🚫 Perintah ini hanya dapat digunakan oleh admin.', { reply_to_message_id: messageId });
          }
          return;
        }

        // --- Admin Commands ---
        // Command: /connect <chatid/@username>
        if (/^\/connect\s+(@?[-\d\w]+)$/i.test(text)) {
          handleConnectCommand(chatId, messageId, text);
          return;
        }

        // Command: /disconnect
        if (/^\/disconnect$/i.test(text)) {
          handleDisconnectCommand(chatId, messageId);
          return;
        }

        // Command: /reconnect
        if (/^\/reconnect$/i.test(text)) {
          handleReconnectCommand(chatId, messageId);
          return;
        }

        // Command: /connection
        if (/^\/connection$/i.test(text)) {
          handleConnectionCommand(chatId, messageId);
          return;
        }

        // --- Basic Chat Interactions (Dihapus sesuai permintaan) ---
        // if (/(halo|hay|hai|hy|hi|hai)/i.test(text)) {
        //     bot.telegram.sendMessage(chatId, 'Halo juga!', { reply_to_message_id: messageId });
        //     matchedInteraction = true;
        // } else if (/apa kabar/i.test(text)) {
        //     bot.telegram.sendMessage(chatId, 'Kabar baik, semoga kamu juga!', { reply_to_message_id: messageId });
        //     matchedInteraction = true;
        // } else if (/(siapa|kamu siapa)/i.test(text)) {
        //     bot.telegram.sendMessage(chatId, 'Saya adalah bot yang dibuat oleh habibGM menggunakan Google Apps Script.', { reply_to_message_id: messageId });
        //     matchedInteraction = true;
        // } else if (/terima kasih/i.test(text)) {
        //     bot.telegram.sendMessage(chatId, 'Sama-sama! Senang bisa membantu.', { reply_to_message_id: messageId });
        //     matchedInteraction = true;
        // } else if (/salam kenal/i.test(text)) {
        //     bot.telegram.sendMessage(chatId, 'Salam kenal juga!', { reply_to_message_id: messageId });
        //     matchedInteraction = true;
        // } else if (/nama kamu siapa\?/i.test(text)) {
        //     bot.telegram.sendMessage(chatId, 'Panggil saja saya Bot Habib.', { reply_to_message_id: messageId });
        //     matchedInteraction = true;
        // } else if (/hah\?/i.test(text)) {
        //     bot.telegram.sendMessage(chatId, 'Ada yang bisa dibantu?', { reply_to_message_id: messageId });
        //     matchedInteraction = true;
        // } else if (/popo(h)?/i.test(text)) { // Mencocokkan popo dan popoh
        //      bot.telegram.sendMessage(chatId, 'Shiro...', { reply_to_message_id: messageId });
        //      matchedInteraction = true;
        //  }

        // FIX: Hapus else terakhir yang menjawab semua pesan tidak dikenal
        // if (!matchedInteraction) {
        //     // Tidak ada command atau keyword yang cocok, dan pesan tidak dihapus oleh filter.
        //     // Bot tidak perlu merespon pesan biasa.
        // }

      } // End if(messageText)

      // Jika pesan bukan teks dan tidak dihapus oleh filter media
      // (Contoh: stiker, audio, dokumen < batas ukuran, dll.)
      // Tidak ada tindakan default di sini.

    } // End if(update.message)

    // deteksi callback query (Inline Button Click)
    else if (update.callback_query) {
      prosesCallback(update.callback_query);
    }
    // Tambahkan handler untuk tipe update lain jika perlu (edited_message, channel_post, dll.)

  } catch (error) {
    Logger.log("Error in prosesPesan: " + error.message + "\nStack: " + error.stack);
    // Kirim notifikasi error ke admin jika diperlukan
    // bot.telegram.sendMessage(adminBot, "Error in prosesPesan: " + error.message);
  }
} // End prosesPesan

// Fungsi untuk escape karakter HTML
function htmlEntities(str) {
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}
function prosesCallback(cb) {
  try {
    if (/info_click/i.exec(cb.data)) {
      let nama = "";
      if (cb.from && cb.from.first_name) {
        nama = cb.from.first_name + (cb.from.last_name ? ' ' + cb.from.last_name : '');
      } else if (cb.message && cb.message.chat && cb.message.chat.first_name) {
        nama = cb.message.chat.first_name + (cb.message.chat.last_name ? ' ' + cb.message.chat.last_name : '');
        console.log("Menggunakan nama dari cb.message.chat (info)");
      } else {
        nama = "Pengguna";
        console.warn("Informasi nama pengguna tidak ditemukan dalam objek cb (info).");
        console.log(cb);
      }

      var infoPesan = "<b>Informasi Bot:</b>\n\n";
      infoPesan += "------------------------\n";
      infoPesan += " Dibuat dengan Google Apps Script\n";
      infoPesan += "Versi: 8.0.5.5\n";
      infoPesan += ` Pengembang: [ <b>${nama}</b> ]\n`;
      infoPesan += "------------------------";

      bot.telegram.answerCallbackQuery(cb.id, "Informasi ditampilkan!", false);
      bot.telegram.sendMessage(cb.message.chat.id, infoPesan, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ Kembali ke Menu Utama", callback_data: "menu_click" }]
          ]
        }
      });
    } else if (/bantuan_click/i.exec(cb.data)) {
      let nama = "";
      if (cb.from && cb.from.first_name) {
        nama = cb.from.first_name + (cb.from.last_name ? ' ' + cb.from.last_name : '');
      } else if (cb.message && cb.message.chat && cb.message.chat.first_name) {
        nama = cb.message.chat.first_name + (cb.message.chat.last_name ? ' ' + cb.message.chat.last_name : '');
        console.log("Menggunakan nama dari cb.message.chat (bantuan)");
      } else {
        nama = "Pengguna";
        console.warn("Informasi nama pengguna tidak ditemukan dalam objek cb (bantuan).");
        console.log(cb);
      }

      var bantuanPesan = "<b>Bantuan:</b>\n\n";
      bantuanPesan += "------------------------\n";
      bantuanPesan += " Ketik perintah yang tersedia untuk menggunakan bot.telegram.\n";
      bantuanPesan += " Hubungi admin jika ada masalah.\n";
      bantuanPesan += `Jika kamu Tahu adminnya Bernama <b>${nama}</b>.\n`;
      bantuanPesan += "------------------------";

      bot.telegram.answerCallbackQuery(cb.id, "Bantuan ditampilkan!", false);
      bot.telegram.sendMessage(cb.message.chat.id, bantuanPesan, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ Kembali ke Menu Utama", callback_data: "menu_click" }]
          ]
        }
      });
    } else if (cb.data === "menu_click") {
      var pesanMenu = "<b>Menu Utama:</b>\n\n";
      pesanMenu += "Silakan pilih perintah:\n";
      pesanMenu += "➡️ /start\n";
      pesanMenu += "➡️ /postingan\n";
      pesanMenu += "➡️ /short urlkamu\n";
      pesanMenu += "➡️ /autoposting pesan anda\n";
      pesanMenu += "➡️ /stopautoposting\n";
      pesanMenu += "\n<b>--- Perintah Admin ---</b>\n";
      pesanMenu += "➡️ /connect &lt;chatid/@username&gt;\n";
      pesanMenu += "➡️ /disconnect\n";
      pesanMenu += "➡️ /reconnect\n";
      pesanMenu += "➡️ /connection\n";
      pesanMenu += "\nAtau gunakan tombol di bawah ini:";

      bot.telegram.answerCallbackQuery(cb.id, "Kembali ke menu utama!", false);
      bot.telegram.sendMessage(cb.message.chat.id, pesanMenu, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "ℹ️ Informasi", callback_data: "info_click" }, { text: "❓ Bantuan", callback_data: "bantuan_click" }]
          ]
        }
      });
    } else {
      bot.telegram.answerCallbackQuery(cb.id, "Callback tidak dikenali.", true);
    }
  } catch (error) {
    Logger.log("Error in prosesCallback: " + error);
    bot.telegram.answerCallbackQuery(cb.id, "Terjadi kesalahan.", true);
    bot.telegram.sendMessage(adminBot, "Error in prosesCallback: " + error);
  }
}

// --- Fungsi Webhook ---
// kamu bisa kunjungi di: https://sfl.gl/iJ6BU
function setWebhook() {
  let url = "https://script.google.com/macros/s/AKfycbxVj6EJJY7UULV0vC1lXvALz3_B-pLJ2zmjj9xFoDLYjneesmk6Gsa42JNmr5mLMB14-g/exec"; // <-- GANTI URL INI!
  try {
    let result = bot.telegram.setWebhook(url);
    Logger.log("Set Webhook Result: " + JSON.stringify(result));
    if (result.ok) {
      Logger.log("Webhook berhasil diatur ke: " + url);
      // Anda bisa mengirim konfirmasi ke admin jika perlu
      // bot.telegram.sendMessage(adminBot, "Webhook berhasil diatur ke: " + url);
    } else {
      Logger.log("Gagal mengatur webhook: " + result.description);
      // bot.telegram.sendMessage(adminBot, "Gagal mengatur webhook: " + result.description);
    }
  } catch (error) {
    Logger.log("Error setting webhook: " + error.message);
    // bot.telegram.sendMessage(adminBot, "Error setting webhook: " + error.message);
  }
}

function getWebhookInfo() {
  try {
    let result = bot.telegram.getWebhookInfo();
    Logger.log("Webhook Info: " + JSON.stringify(result, null, 2));
    // Kirim info ke admin jika perlu
    // bot.telegram.sendMessage(adminBot, "Webhook Info:\n<pre>" + JSON.stringify(result, null, 2) + "</pre>", {parse_mode: "HTML"});
  } catch (error) {
    Logger.log("Error getting webhook info: " + error.message);
    // bot.telegram.sendMessage(adminBot, "Error getting webhook info: " + error.message);
  }
}

function deleteWebhook() {
  try {
    let result = bot.telegram.deleteWebhook(); // deleteWebhook biasanya tidak butuh argumen di library standar
    Logger.log("Delete Webhook Result: " + JSON.stringify(result));
    if (result.ok) {
      Logger.log("Webhook berhasil dihapus.");
      // bot.telegram.sendMessage(adminBot, "Webhook berhasil dihapus.");
    } else {
      Logger.log("Gagal menghapus webhook: " + result.description);
      // bot.telegram.sendMessage(adminBot, "Gagal menghapus webhook: " + result.description);
    }
  } catch (error) {
    Logger.log("Error deleting webhook: " + error.message);
    // bot.telegram.sendMessage(adminBot, "Error deleting webhook: " + error.message);
  }
}
