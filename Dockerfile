# 使用 Node.js 20 作為基底
FROM node:20-alpine

# 建立 app 資料夾
WORKDIR /app

# 複製 package.json 與 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm install --production

# 複製專案檔案
COPY . .

# 設定時區為台北時間
ENV TZ=Asia/Taipei

# Bot 不需要外部埠口，保持 Cloud Run 預設 8080 即可
EXPOSE 8080

# 啟動程式
CMD [ "npm", "start" ]