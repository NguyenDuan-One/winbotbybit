const { exec } = require('child_process');

function backupDatabase() {
    const dbName = 'crypto-bot';
    const backupDir = 'backup'; // Thư mục lưu trữ file backup

    exec(`mongodump --db ${dbName} --host localhost --port 27017  --out ${backupDir}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Backup process error: ${error}`);
        } else {
            console.log(`Backup process completed successfully: ${stdout}`);
        }
    });
}

// Gọi hàm backup
backupDatabase();
