import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs/promises';

const app : express.Application = express();
const port : number = Number(process.env.PORT) || 3002;

app.set('view engine', 'ejs');
app.use(express.static(path.resolve(__dirname, 'public')));

// When wanting to include errorhandling and e.g. file type checks, the handler can be created
// like this, and then manually called inside the POST request function down below for /upload
const uploadHandler : express.RequestHandler = multer({
  dest: path.resolve(__dirname, 'tmp'),
  fileFilter : (req, file, callback) => {
    // file.mimetype is in the format of e.g. "image/jpg", so splitting it at / and taking the second value from the array gives the correct file format
    if (['json'].includes(file.mimetype.split('/')[1])) {
      callback(null, true)
    } else {
      callback(new Error('Virheellinen tiedostomuoto'))
    }
  }
}).single('tiedosto')


app.get('/', (req : express.Request, res : express.Response) => {
  res.render('index');
})

app.post('/upload', async (req : express.Request, res : express.Response) => {
  uploadHandler(req, res, async (err : any) => {
    if (err instanceof multer.MulterError) {
      res.render('virhe', {'virhe': 'Jotain meni vikaan'})
    } else if (err) {
      res.render('virhe', {'virhe': 'Virheellinen tiedostomuoto. Käytä ainoastaan JSON-tiedostoja.'})
    } else {
      if (req.file) {
        let fileName : string = `${req.file.filename}.json`;
        // The original filename is in the format of e.g. "maaliskuu_2022.json". To get the month and the year for the heading in the result page,
        // the filename is formatted here
        let originalName : string = `${req.file.originalname}`.split(/_|.json/).join(' ')
        let capitalizedOriginalName : string = originalName.charAt(0).toUpperCase() + originalName.slice(1)

        await fs.copyFile(path.resolve(__dirname, 'tmp', String(req.file.filename)), path.resolve(__dirname, 'public', 'json', fileName));

        /* Save the data from the newly saved file to a variable, and make it JSON with JSON.parse (otherwise it would be a string by default) */
        try {
          const data = JSON.parse(await fs.readFile(path.resolve(__dirname, 'public', 'json', fileName), {encoding: 'utf8'}))
          res.render('tulos', { data, originalName : capitalizedOriginalName })
        } catch (err : any) {
          console.log('Virhe luettaessa tiedostoa! ' + err)
        }

      }
    }
  })

})

app.listen(port, () => {
  console.log(`Server started running on port ${port}`)
})