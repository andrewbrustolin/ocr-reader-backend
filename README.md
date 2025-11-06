INSTRUCTIONS TO RUN THE BACKEND IN DEVELOPMENT MODE

- install node/npm on your machine
- clone the project: git clone https://github.com/andrewbrustolin/ocr-reader-backend.git
- move to the root project directory
- create .env in your root project directory
  - add the following variables to your .env:
    - PORT=3000
    - DATABASE_URL="file:./dev.db"
    - JWT_SECRET=supersecretjwtkey
    - JWT_EXPIRES_IN=3600s
- run this command: npm install
- run this  command inside your root project directory to create/initialize the db locally: npx prisma migrate
- you can run this command to check your db tables: npx prisma studio
- start the backend with: npm run start

Now you can start the frontend on a port different from the port in your backend's .env file
This application's frontend is located here: https://github.com/andrewbrustolin/ocr-reader-frontend





