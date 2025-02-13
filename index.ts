import express from 'express';
import path from 'path';
import {PrismaClient} from '@prisma/client';

const app : express.Application = express();
const port : number = Number(process.env.PORT) || 3002;

app.set('view engine', 'ejs');

app.get('/', (req : express.Request, res : express.Response) => {
  res.render('index');
})

app.listen(port, () => {
  console.log(`Server started running on port ${port}`)
})