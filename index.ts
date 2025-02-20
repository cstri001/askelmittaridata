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
    // Update: Changed "file.mimetype.split" check to file.originalname.split due to csv mimetype being weird (vnd.ms-excel)
    if (['json', 'csv'].includes(file.originalname.split('.')[1])) {
      callback(null, true)
    } else {
      callback(new Error('Jotain meni vikaan'))
    }
  }
}).single('tiedosto')

// Checks whether the numeric data on each entry is actually numeric and convertable to a number - if not number, returns false immediately
const numValidator = (splitEntry : string[]) => {
  for (let entry of splitEntry) {
    let convertedNum = Number(entry)
    console.log(convertedNum)
    if (isNaN(convertedNum)) {
      return false;
    }
  }
  return true;
} 

/* 
  Takes CSV-files and converts them to JSON files to the same format as the plain JSON files 
  Checks the validity of entry data with numValidator - if some entry is non-numeric and cannot be converted to a number,
  returns false. Otherwise, return JSON data.
*/
const csvToJson = (file : string[]) => {
  let finalArray : Object[] = []
  let columnNames = file[0].split(/;|\r/)
  // Remove the entry string from the end of array
  columnNames.pop()

  // LISÄÄ TÄHÄN HEI TSEKKAUS SIITÄ, ETTÄ ONKO SPLIT ENTRYN LENGTH 4 ESIM!!!! 
  // JOS EI, NIIN RETURN FALSE TOSSA ALLA

  for (let i = 1; i < file.length -1; i++) {
    // At this point, the data is in the form of ["01;01;2022;1000", "02;01;2022;2400",] etc
    let splitEntry = file[i].split(/;|\r/)

    if (numValidator(splitEntry)) {
      try {
        let entry = {'pp': splitEntry[0], 'kk': Number(splitEntry[1]), 'vvvv': Number(splitEntry[2]), 'askeleet': Number(splitEntry[3])}
        finalArray.push(entry)
      } catch {
        console.log('huip');
      }
    } else {
      return false
    }
  }

  return JSON.parse(JSON.stringify(finalArray))
}

app.get('/', (req : express.Request, res : express.Response) => {
  res.render('index', {'virhe': ''});
})

app.post('/upload', async (req : express.Request, res : express.Response) => {

  uploadHandler(req, res, async (err : any) => {
    if (err instanceof multer.MulterError) {
      res.render('virhe', {'virhe': 'Jotain meni vikaan'})
    } else if (err) {
      res.render('virhe', {'virhe': 'Virheellinen tiedostomuoto. Käytä ainoastaan JSON- tai CSV-tiedostoja.'})
    }
    
    if (req.file) {
      // let fileType : string = `${req.file.mimetype.split('/')[1]}`
      let fileType : string = `${req.file.originalname.split('.')[1]}`
      let fileName : string = `${req.file.filename}.${fileType}`;
      
      // The original filename is in the format of e.g. "maaliskuu_2022.json". To get the month and the year for the heading in the result page,
      // the filename is formatted here
      let originalName : string = `${req.file.originalname}`.split(/_|.json|.csv/).join(' ')
      let capitalizedOriginalName : string = originalName.charAt(0).toUpperCase() + originalName.slice(1)

      // Copy file to corresponding folder (see fileType above)
      await fs.copyFile(path.resolve(__dirname, 'tmp', String(req.file.filename)), path.resolve(__dirname, 'public', fileType, fileName));

      /* Save the data from the newly saved file to a variable, and make it JSON with JSON.parse (otherwise it would be a string by default) */
      try {
        if (fileType === 'json') {
          const data = JSON.parse(await fs.readFile(path.resolve(__dirname, 'public', fileType, fileName), {encoding: 'utf8'}))
          res.render('tulos', { data, originalName : capitalizedOriginalName, fileType })
        } else {
          let data : string = await fs.readFile(path.resolve(__dirname, 'public', fileType, fileName), {encoding: 'utf-8' })
          // Make every newline in this stringified CSV into an Array item
          let splitData : string[] = data.split(/\n/g)

          console.log(csvToJson(splitData))
          const convertedData = csvToJson(splitData)

          // If csvToJson returned false, i.e. something was not right when converting, render error page
          // Otherwise, render results as normal
          if (convertedData) {
            res.render('tulos',  {data : convertedData, originalName : capitalizedOriginalName, fileType })
          } else {
            res.render('virhe', {'virhe': 'Dataa ei voitu konvertoida. Jotain meni vikaan.'})
          }

        }
      } catch (err : any) {
        console.log('Virhe luettaessa tiedostoa! ' + err)
      }
      

    } else {
      res.render('index', {'virhe': 'Virhe: tiedosto puuttuu'})
    } 
  })

})

app.listen(port, () => {
  console.log(`Server started running on port ${port}`)
})