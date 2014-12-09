/**
 * New node file
 */

var mongo = require('mongodb');
var crypto = require('crypto');
var key = 'V77q995EZX36DDYw0OTjBpW0587i7DM4';
var create_hash = function(state,ts){
	var text = state + ts + key;
	hmac = crypto.createHmac("sha256", key);
	hmac.setEncoding('base64');
	hmac.write(text);
	hmac.end();
	hash = hmac.read();
	return hash;
}

var Server = mongo.Server,
Db = mongo.Db,
BSON = mongo.BSONPure;

var server = new Server('ds043210.mongolab.com',43210,{auto_reconnect: true});
db = new Db('mongolab_test', server);

db.open(function(err, db) {
	db.authenticate('root', 'password', function(err, success) {
		if(!err) {
	        console.log("Connected to 'gumballdb' database");
	        db.collection('gumball', {strict:true}, function(err, collection) {
	            if (err) {
	                console.log("The 'gumballs' collection doesn't exist.");
	            }
	        });
	    }
    });
    
});

exports.addMachine = function(req, res){
	var machine = req.body;
	db.collection('gumball', function(err, data){
		data.insert(machine, {safe: true}, function(err, result){
			if (err) {
	            res.send({'error':'Error occurred'});
			}
			else{
				res.send(result[0]);
			}
		});
	});
}

exports.listMachines = function(req, res){
	db.collection('gumball', function(err, collection) {
        collection.find().toArray(function(err, list) {
        	 res.render('listMachines', {result:list});// res.send(items);
        });
    });
}


exports.getDetails = function(req, res){
	var id = req.params.id;
	console.log("id: " + id);
	db.collection('gumball', function(err, collection){
		collection.findOne({'_id':new BSON.ObjectID(id)}, function(err, record){
			var state = 'No Coin';
			var ts = new Date().getTime();
			var hash= create_hash(state, ts);
			res.render('getDetails',{result: record, _id:id, state: state, hash: hash, ts: ts, notify: 'Please insert coin'});
		});
	});
}

exports.updateMachine = function(req, res){
	var id = req.params.id;
	var input = JSON.parse(JSON.stringify(req.body));
	var state = input.state;
	var activity = input.activity;
	var ts = parseInt(input.ts);
	var hash_first = input.hash;
	var now = new Date().getTime();
	var diff = ((now-ts)/1000);
	var hash_second = create_hash(state,ts);
	
	var data= {
			id: id,
			serialNo: input.serialNo,
			modelNo: input.modelNo,
			count: input.count
	}
	console.log(data);
	
	if(diff>120){
		res.render('getDetails', {result: data, _id:id, state:state, ts:now,hash: hash, notify: 'Invalid Session'});
	}
	if(activity == "Insert Quarter"){
		if(state == "No Coin"){
			var newState = "Has Coin";
			var newHash = create_hash(state, now);
			res.render('getDetails', {result: data, _id:id, state:newState, ts:now, hash: newHash, notify:'Coin Inserted'});
		}
		else{
			res.render('getDetails', {result: data, _id:id, state:state, ts:now, hash: create_hash(state,now), notify:'Coin already Inserted'});
		}
	}
	else{
		if(state == "No Coin"){
			res.render('getDetails', {result: data, _id:id, state:state,ts:now, hash: create_hash(state, now), notify:'Please Insert Coin'});
		}
		else if(state == "Has Coin"){
				if(input.count>0){
					var data1 = {
							serialNo: input.serialNo,
							modelNo: input.modelNo,
							count: input.count - 1
					}
				db.collection('gumball', function(err, collection){
					collection.update({'_id':new BSON.ObjectID(id)}, data1, {safe:true}, function(err, result) {
						if (err) {
			                console.log('Error updating gumball: ' + err);
			                res.send({'error':'An error has occurred'});
			            } 
						else {
			                console.log('' + result + ' document(s) updated');
			                res.render('getDetails', {result:data1, _id:id, ts:now, hash: create_hash('No Coin', now), state:'No Coin', notify:'Enjoy your gumball'});
			            }
					});
				});
				}
				else{
					res.render('getDetails', {result: data, ts: now, hash: create_hash(state, now), state: state, notify:'No Inventory'});
				}
		}
	}
	
}