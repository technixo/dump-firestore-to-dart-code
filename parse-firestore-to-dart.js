const admin = require("firebase-admin");
const _ = require('lodash')
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const DEFAULT_MOCK_INSTANT = 'mockFirestore'
async function buildDartScriptForDocumentFromData({docData, firestorePath, justSingleLine = false, mockInstance, mockFirestoreInstance}){
    mockInstance = mockInstance || mockFirestoreInstance || DEFAULT_MOCK_INSTANT;
    // if(typeof firestorePath === 'undefined') return justSingleLine ? null : [];
    const final_object = {}
    const replace_mapping = {}
    let dartScript = [];
    const tasks = []
    function parseReferenceType(value, keyArr = []){
        const replaceKey = keyArr.join('_');
        if(_.isArray(value)){
            value.forEach((elm, i) => {
                parseReferenceType(elm, [...keyArr, i]);
            })
        }else if(value && typeof value == 'object'){
            if('DocumentReference' === value.constructor.name){
                _.set(final_object, keyArr, `$$replace_key_${replaceKey}$$`)
                replace_mapping[replaceKey] = `${mockInstance}.doc('${value.path}')`;
                tasks.push(buildDartScriptForDocument(value.path, true, mockInstance))
            }
        }
    }
    _.forIn(docData , async (value, key) => {
        final_object[key] = value;
        parseReferenceType(value, [key])
    })
    let finalJSON = JSON.stringify(final_object, null, 8)
    // console.log(finalJSON)
    _.forIn(replace_mapping, (value, key) => {
        finalJSON = finalJSON.replace( new RegExp(`"\\$\\$replace_key_${key}\\$\\$"`, 'g'), value);
    })
    dartScript = await Promise.all(tasks)
    const dartSetLine = `await ${mockInstance}.doc('${firestorePath}').set(${finalJSON});`
    dartScript.push(dartSetLine)
    return justSingleLine ? dartSetLine : dartScript;
}

async function buildDartScriptForDocument(firestorePath, justSingleLine = false, mockFirestoreInstance){
    const documentSnapshot = await admin.firestore().doc(firestorePath).get();
    // console.log(documentSnapshot)
    const docData = documentSnapshot.data();
    return buildDartScriptForDocumentFromData({docData, firestorePath, mockFirestoreInstance})
}

module.exports = async function(firestorePath, limit = 10, mockFirestoreInstance){
    limit = Number(limit);
    while(firestorePath.charAt(0) === '/')
    {
        firestorePath = firestorePath.substring(1);
    }
    const segments = firestorePath.split('/');
    const isDocument = segments.length % 2 === 0;
    let dartScript = null
    if(isDocument){
        dartScript = await buildDartScriptForDocument(firestorePath, false, mockFirestoreInstance).then(arr=>arr.join('\n'));
    }else{
        const processTasks = await admin.firestore().collection(firestorePath).limit(limit).get().then(
            querySnapshot => {
                return querySnapshot.docs.map(
                    doc => buildDartScriptForDocumentFromData({docData: doc.data(), mockInstance: mockFirestoreInstance}).then(arr=>arr.join('\n'))
                )
            }
        )
        dartScript = await Promise.all(processTasks).then(arr=>arr.join('\n'));
    }
    return `Future<void> initFirestoreMockData() async {
${dartScript.split('\n').map(line=>'\t\t'+line.replace(/"/g,"'")).join('\n')}
\t}`;
}