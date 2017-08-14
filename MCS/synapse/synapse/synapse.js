/**
 * The ExpressJS namespace.
 * @external ExpressApplicationObject
 * @see {@link http://expressjs.com/3x/api.html#app}
 */

var request = require('request');

/**
 * Mobile Cloud custom code service entry point.
 * @param {external:ExpressApplicationObject}
 * service
 */
module.exports = function(service) {


	/**
	 *  The file samples.txt in the archive that this file was packaged with contains some example code.
	 */


	service.get('/mobile/custom/synapse/user/info/all', function(req,res) {
		var result = {};
		if (res.statusCode == 200){
      request('http://' + BACKEND_IP + '/user/info/all', function(error, response, body) {
  			if (response.statusCode == 200 || response.statusCode == 201){
  				result = body;
  			} else {
          console.warn(response.statusCode);
          result = {
            'statusCode': response.statusCode,
            'body': body
          };
  			}
  			res.type('application/json');
  			res.status(response.statusCode).send(result);
  		});
		}
	});

	service.get('/mobile/custom/synapse/event/info/:event_id', function(req,res) {
    var result = {};
		if (res.statusCode == 200){
      request('http://' + BACKEND_IP + '/event/info/' + req.params.event_id, function(error, response, body) {
  			console.info(response);
        console.info(body);
  			if (response.statusCode == 200 || response.statusCode == 201){
  				result = body;
  			} else {
          console.warn(response.statusCode);
          result = {
            'statusCode': response.statusCode,
            'body': body
          };
  			}
  			res.type('application/json');
  			res.status(response.statusCode).send(result);
  		});
		}
	});

  service.get('/mobile/custom/synapse/event/info/all', function(req,res) {
    var result = {};
		if (res.statusCode == 200){
      request('http://' + BACKEND_IP + '/event/info/all', function(error, response, body) {
  			if (response.statusCode == 200 || response.statusCode == 201){
  				result = body;
  			} else {
          console.warn(response.statusCode);
          result = {
            'statusCode': response.statusCode,
            'body': body
          };
  			}
  			res.type('application/json');
  			res.status(response.statusCode).send(result);
  		});
		}
	});

	service.get('/mobile/custom/synapse/event/info/bounds/:latSW/:lonSW/:latNE/:lonNE', function(req,res) {
    var result = {};
		if (res.statusCode == 200){
      request('http://' + BACKEND_IP + '/event/info/bounds/' + req.params.latSW + '/' + req.params.lonSW +'/'+ req.params.latNE +'/'+req.params.lonNE, function(error, response, body) {
  			if (response.statusCode == 200 || response.statusCode == 201){
  				result = body;
  			} else {
          console.warn(response.statusCode);
          result = {
            'statusCode': response.statusCode,
            'body': body
          };
  			}
  			res.type('application/json');
  			res.status(response.statusCode).send(result);
  		});
		}
	});

	service.get('/mobile/custom/synapse/report/info/all', function(req,res) {
    var result = {};
		if (res.statusCode == 200){
      request('http://' + BACKEND_IP + '/report/info/all', function(error, response, body) {
  			if (response.statusCode == 200 || response.statusCode == 201){
  				result = body;
  			} else {
          console.warn(response.statusCode);
          result = {
            'statusCode': response.statusCode,
            'body': body
          };
  			}
  			res.type('application/json');
  			res.status(response.statusCode).send(result);
  		});
		}
	});

	service.get('/mobile/custom/synapse/user/info/:user_id', function(req,res) {
    var result = {};
		if (res.statusCode == 200){
      request('http://' + BACKEND_IP + '/user/info/' + req.params.user_id, function(error, response, body) {
  			console.info(response);
        console.info(body);
  			if (response.statusCode == 200 || response.statusCode == 201){
  				result = body;
  			} else {
          console.warn(response.statusCode);
          result = {
            'statusCode': response.statusCode,
            'body': body
          };
  			}
  			res.type('application/json');
  			res.status(response.statusCode).send(result);
  		});
		}
	});

	service.get('/mobile/custom/synapse/report/info/:report_id', function(req,res) {
    var result = {};
		if (res.statusCode == 200){
      request('http://' + BACKEND_IP + '/report/info/' + req.params.report_id, function(error, response, body) {
  			console.info(response);
        console.info(body);
  			if (response.statusCode == 200 || response.statusCode == 201){
  				result = body;
  			} else {
          console.warn(response.statusCode);
          result = {
            'statusCode': response.statusCode,
            'body': body
          };
  			}
  			res.type('application/json');
  			res.status(response.statusCode).send(result);
  		});
		}
	});


  service.post('/mobile/custom/synapse/report/add', function(req,res) {
    console.info(req.body);
    var result = {};
    var d = new Date();
		if (res.statusCode == 200 || res.statusCode == 201){
      request.post({
        url: 'http://' + BACKEND_IP + '/report/add/',
        form: req.body
      },
      function(error, response, body) {
        console.info(body);
  			if (response.statusCode == 201){
  				result = body;
  			} else {
          console.warn(response.statusCode);
          result = {
            'statusCode': response.statusCode,
            'body': body
          };
  			}
  			res.type('application/json');
  			res.status(response.statusCode).send(result);
  		});
		}
	});

  service.post('/mobile/custom/synapse/event/verify', function(req,res) {
    var result = {};
    console.info("event_id:");
    console.info(req.body.event_id);
		if (res.statusCode == 200 || res.statusCode == 201){
      request.post({
        url: 'http://' + BACKEND_IP + '/event/verify/',
        form: req.body
      },
      function(error, response, body) {
        console.info(body);
  			if (response.statusCode == 201){
  				result = body;
  			} else {
          console.warn(response.statusCode);
          result = {
            'statusCode': response.statusCode,
            'body': body
          };
  			}
  			res.type('application/json');
  			res.status(response.statusCode).send(result);
  		});
		}
	});

  service.post('/mobile/custom/synapse/event/dispute', function(req,res) {
    var result = {};
    if (res.statusCode == 200 || res.statusCode == 201){
      request.post({
        url: 'http://' + BACKEND_IP + '/event/dispute/',
        form: req.body
      },
      function(error, response, body) {
        console.info(body);
        if (response.statusCode == 201){
          result = body;
        } else {
          console.warn(response.statusCode);
          result = {
            'statusCode': response.statusCode,
            'body': body
          };
        }
        res.type('application/json');
        res.status(response.statusCode).send(result);
      });
    }
  });

};
