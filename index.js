const express = require('express');
const bodyParser = require('body-parser');
const app = express()
const port = 3000
const parseFunction = require('./parse-firestore-to-dart')


app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')
app.get('/', (req, res) => {
    let err = null, dartScript = null, firestorePath = null, limitDocument = null, mockFirestoreInstance = null;
    res.render('index', {dartScript, err, firestorePath, limitDocument, mockFirestoreInstance})
})

app.post('/', async (req, res) => {
    let {firestorePath, limitDocument, mockFirestoreInstance} = req.body;

    let err = null, dartScript = null
    try{
        if(firestorePath.length <= 0){
            throw 'Please enter firestorePath';
        }
        dartScript = await parseFunction(firestorePath, limitDocument, mockFirestoreInstance);
    }catch (e) {
        err = e.toString();
    }
    res.render('index', {dartScript, err, firestorePath, limitDocument, mockFirestoreInstance});

})

app.listen(port, () => {
    console.log(`The app listening at http://localhost:${port}`)
})
