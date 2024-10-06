const { exec } = require('child_process');
const path = require('path');


const MONGO_URI = 'mongodb://localhost:27017/crypto-bot'; // URI kết nối MongoDB
const BACKUP_PATH = 'bk/'; // Đường dẫn lưu trữ sao lưu
const BACKUP_FILE = path.join(BACKUP_PATH, `backup.gz`); 

// Lệnh khôi phục cơ sở dữ liệu MongoDB
const restoreCommand = `mongosh "${MONGO_URI}" --eval 'db.dropDatabase()' &&  mongorestore --uri="${MONGO_URI}" --gzip --archive=${BACKUP_FILE}`;

exec(restoreCommand, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error executing mongorestore: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
    console.log('Database restored successfully.');
});
