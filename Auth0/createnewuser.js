function(user, context, callback) {
    // short-circuit if the user signed up already
    if (context.stats.loginsCount > 1) return callback(null, user, context);

    var id = user.user_id;
    var backendUrl;

    // Use staging backend
    if (context.clientID === STAGING_CLIENT_ID) {
        backendUrl = 'http://' + BACKEND_IP + '/user/add/';

    // Use production backend
    } else {
        backendUrl = 'http://' + BACKEND_IP + '/user/add/';
    }

    request({
        method: 'POST',
        url: backendUrl,
        form: {'user_id': id, 'home_lat': '0', 'home_long': '0'}
    }, function(error, response, body) {
        callback(null, user, context);
    });
 }
