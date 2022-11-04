var multer = require('multer');
var bodyParser = require('body-parser');

const express = require('express');
const app = express();

const knex = require('knex')({
  client: 'mysql',
  connection: {
    host : 'sql3.freesqldatabase.com',
    port : 3306,
    user : 'sql3522640',
    password : '2qmVSTYewk',
    database : 'sql3522640'
  }
});

var upload = multer();

app.set('views', './src/public/views')
app.set('view engine', 'pug');

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(upload.array());

app.use(express.static('./src/public'));

app.get('/', async (_, res) => {
  let list;

  try {
    list =  await knex('Turno').select('Turno.ID', 'Turno.cteName', 'TurnosRecordTime.tmTurno', 'TipoServicio.NameService', 'Turno.tmCreated', 'Turno.IDState')
      .innerJoin('TipoServicio', 'Turno.IDServicio', 'TipoServicio.ID').innerJoin('TurnosRecordTime', 'Turno.ID', 'TurnosRecordTime.IDTurno')
      .whereNot('TurnosRecordTime.IDState', '2');
  } catch (error) {
    list = [{
      'ID': 1,
      'cteName': 'Raul',
      'tmTurno': new Date(),
      'NameService': 'Revision rutinaria',
      'tmCreated': new Date(),
      'IDState': 1
    }];
  }

  res.render('index', { list });
})

app.get('/form', async (req, res) => {
  // aca debo pasar mutual y tipo de servicio
  let listmutual, listservice;
  try {
    listservice =  await knex('TipoServicio').select('ID', 'NameService', 'Importe');
  } catch (error) {
    listservice = [{
      'ID': 0,
      'NameService': 'Revision rutinaria',
      'Importe': 300
    }];
  }
  try {
    listmutual =  await knex('ObraSocial').select('ID', 'Name', 'DescDefault');
  } catch (error) {
    listmutual = [{
      'ID': 0,
      'Name': 'DSAUTEN',
      'DescDefault': 10
    }];
  }

  // si tiene ciertas cosas pasarlas como una modificacion con los otros valores, aca ya toco eso
  if(req.query.new = 'false' && req.query.id != undefined && req.query.id > 0){
    let data =  await knex('Turno').select(
        'Turno.cteName',
        'Turno.cteApellido',
        'TurnosRecordTime.tmTurno',
        'TipoServicio.NameService',
        'Turno.Description',
        'ObraSocial.Name',
        'ObraSocial.DescDefault',
        'Turno.IDTrabajador')
      .innerJoin('TipoServicio', 'Turno.IDServicio', 'TipoServicio.ID')
      .innerJoin('TurnosRecordTime', 'Turno.ID', 'TurnosRecordTime.IDTurno')
      .innerJoin('ObraSocial', 'Turno.IDObra', 'ObraSocial.ID')
      .where('Turno.ID', req.query.id);

    data = data[0];
    data.tmTurno = data.tmTurno.toISOString().split('T');
    data.tmTurno[1] = data.tmTurno[1].slice(0,5);

    res.render('form', {
      mutuales: listmutual,
      typeservices: listservice,
      modify: req.query.id,
      prevdata: data
    });
  }else{
    res.render('form', {
      mutuales: listmutual,
      typeservices: listservice,
      modify: '-1'
    });
  }
  
});

app.post('/crtEvent', async (req, res) => {
  // new: '',
  // inputName: '',
  // inputLName: '',
  // inputTService: 'Consulta rutinaria',
  // inputMutual: 'Ninguna',
  // inputDesc: '',
  // inputID: '',
  // inputTime: '13:30',
  // inputDate: '2022-06-22',

  if(parseInt(req.body.modify) != -1){
    await knex('Turno')
      .update({
        IDTrabajador: req.body.inputID,
        IDServicio: req.body.inputTService,
        IDObra: req.body.inputMutual,
        tmCreated: new Date(),
        cteName: req.body.inputName,
        cteApellido: req.body.inputLName,
        IDState: 1,
        Description: req.body.inputDesc
      }).where('ID', parseInt(req.body.modify));

    await knex('TurnosRecordTime')
      .where('IDTurno', parseInt(req.body.modify))
      .andWhere('IDState', 1)
      .update({
        IDState: 2,
      });
    await knex('TurnosRecordTime')
      .insert({
        IDTurno: parseInt(req.body.modify),
        tmTurno: new Date(`${req.body.inputDate}T${req.body.inputTime}:00`),
        IDState: 1,
        Description: ''
      });
  }else{
    const date = new Date()

    await knex('Turno')
      .insert({
        IDTrabajador: req.body.inputID,
        IDServicio: req.body.inputTService,
        IDObra: req.body.inputMutual,
        tmCreated: date,
        cteName: req.body.inputName,
        cteApellido: req.body.inputLName,
        IDState: 1,
        Description: req.body.inputID
      });
    
    let id = await knex('Turno').select('ID').where('IDTrabajador', req.body.inputID).andWhere('tmCreated', date).andWhere('IDState', 1)

    await knex('TurnosRecordTime')
      .insert({
        IDTurno: id[0].ID,
        tmTurno: new Date(`${req.body.inputDate}T${req.body.inputTime}:00`),
        IDState: 1,
        Description: ''
      });
  }

  res.redirect('/');
});

app.post('/posEvent', async (req, res) => {
  await knex('Turno')
    .where('ID', req.body.id)
    .update({
      IDState: 4,
    });

  await knex('TurnosRecordTime')
    .where('IDTurno', req.body.id)
    .andWhere('IDState', 1)
    .update({
      IDState: 2,
    });
  await knex('TurnosRecordTime')
    .insert({
      IDTurno: req.body.id,
      tmTurno: new Date(`${req.body.inputDate}T${req.body.inputTime}:00`),
      IDState: 1,
      Description: req.body.inputDesc
    });
});

app.post('/canEvent', async (req, res) => {
  await knex('Turno')
    .where('ID', req.body.id)
    .update({
      IDState: 2,
    });
});
app.post('/succEvent', async (req, res) => {
  await knex('Turno')
    .where('ID', req.body.id)
    .update({
      IDState: 3,
    });
});

app.listen(process.env.PORT || 3001, () => {});
