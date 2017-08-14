from flask import Flask, request
from flask_restful import Resource, Api, abort, reqparse
from sqlalchemy import *
from json import dumps
from utility import doMergeJob, doMergeJobOneEvent
from synapseScore import *
from datetime import datetime

e = create_engine('mysql://root:pw@localhost/SynapseDB')

app = Flask(__name__)
api = Api(app)
parser = reqparse.RequestParser()
parser.add_argument('event_id', type = int)
parser.add_argument('report_id', type = int)
parser.add_argument('user_id', type = str)
parser.add_argument('category', type = str)
parser.add_argument('home_lat', default = 0.0, type = float)
parser.add_argument('home_long', default = 0.0, type = float)
parser.add_argument('location_lat', default = 0.0, type = float)
parser.add_argument('location_long', default = 0.0, type = float)
#parser.add_argument('time', default = datetime.now().strftime('%Y-%m-%d %H:%M:%S'), type=str)
parser.add_argument('time', default = datetime.utcnow().strftime('%a, %d %m %Y %H:%M:%S %Z'), type=str) #  Tue, 13 Jun 2017 00:57:35 GMT  
parser.add_argument('vote',type=str)
parser.add_argument('type',type=str)
parser.add_argument('description',type=str)
parser.add_argument('cost',type=str)

def stringify(target):
    return '\'' + target + '\''

# Test routing page
@app.route('/')
def index():
    return 'Index Page'

# Function: assignNewID
# This function returns the next sequential id
# of the table defined by the parameter tableName.
def assignNewID(tableName, idColumn):
    conn = e.connect()
    command = "SELECT MAX(%s) FROM %s" %(idColumn, tableName)
    query = conn.execute(command)
    nextID = query.cursor.fetchone()[0] + 1
    return nextID

# (GET) Endpoint for viewing all user information
class User_Info_All(Resource):
    def get(self):
        conn = e.connect()
        command = "SELECT * FROM SynapseUser"
        query = conn.execute(command)
        response = {'data': [dict(zip(tuple (query.keys()) ,i)) for i in query.cursor]}
        return response, 200

# (GET) Endpoint for viewing user information
class User_Info(Resource):
    def get(self, user_id):
        conn = e.connect()
        command = "SELECT * FROM SynapseUser WHERE user_id = %s" % stringify(user_id)
        query = conn.execute(command)
        response = {'data': [dict(zip(tuple (query.keys()) ,i)) for i in query.cursor]}
        return response, 200

# (POST) Endpoint for adding new user
class Add_New_User(Resource):
    def post(self):
        args = parser.parse_args()
        conn = e.connect()
	userID = stringify(args['user_id'])
	home_lat = args['home_lat']
	home_long = args['home_long']
        command = "INSERT INTO SynapseUser VALUES (%s, %f, %f)" % (userID, home_lat, home_long)
        conn = conn.execute(command, args)
        response = {k : v for k, v in args.items() if v}
        response['user_id'] = userID
        return response, 201

# (GET) Endpoint for viewing all Report information
class Report_Info_All(Resource):
    def get(self):
        conn = e.connect()
        command = "SELECT * FROM Report"
        query = conn.execute(command)
        response = {'data': [dict(zip(tuple (query.keys()) ,i)) for i in query.cursor]}
        return response, 200

# (GET) Endpoint for viewing Report information
class Report_Info(Resource):
    def get(self, report_id):
        conn = e.connect()
        command = "SELECT * FROM Report WHERE report_id = %d"%report_id
        query = conn.execute(command)
        if query.rowcount == 0:
            response = {'data': [{'deleted': True}]}
        else:
            response = {'data': [dict(zip(tuple (query.keys()) ,i)) for i in query.cursor]}
        return response, 201

# (POST) Endpoint for adding new Report
class Add_New_Report(Resource):
    def post(self):
        newReportID = assignNewID('Report', 'report_id')
        newEventID = assignNewID('Event', 'event_id')
        args = parser.parse_args()
        conn = e.connect()
        initialRadius = 0.0
        initialCurrentScore = 0.0
        initialLastVerifyScore = 0.0
        commandCreateNewEvent = """INSERT INTO Event VALUES (%d, %s, %f, %f, %f, %s, %s, %f, %f, %s, %s, %s)""" % (newEventID, stringify(args["category"]), initialRadius, initialCurrentScore, initialLastVerifyScore, stringify(args["time"]), stringify(args["time"]), args["location_lat"], args["location_long"], stringify(args['type']), stringify(args['description']), args['cost'])

	commandAddReport = """INSERT INTO Report VALUES (%d, %d, %s, %s, %f, %f, %s, %s, %s, %s)""" % (newReportID, newEventID, stringify(args["user_id"]), stringify(args["category"]), args["location_lat"], args["location_long"], stringify(args["time"]), stringify(args["type"]), stringify(args["description"]), args["cost"])

        queryCreateNewEvent = conn.execute(commandCreateNewEvent, args)
        mergedEvent = doMergeJobOneEvent(newEventID, args['category'], e, True)
        if mergedEvent:
            commandAddReport = """INSERT INTO Report VALUES (%d, %d, %s, %s, %f, %f, %s, %s, %s, %s)""" % (newReportID, mergedEvent['event_id'], stringify(args["user_id"]), stringify(args["category"]),
                    args["location_lat"], args["location_long"], stringify(args["time"]),
                    stringify(args['type']), stringify(args['description'], args['cost']))
        queryAddReport = conn.execute(commandAddReport, args)
        response = {k : v for k, v in args.items() if v}
        response['event_id'] = newEventID
        response['report_id'] = newReportID
        response['radius'] = initialRadius
        response['current_score'] = initialCurrentScore
        return response, 201

# (GET) Endpoint for viewing Event information
class Event_Info_Bounds(Resource):
    def get(self, latSW, lonSW, latNE, lonNE):
        args = parser.parse_args()
        # given the bounds, construct SQL command for btwn lat and btwn lon
        conn = e.connect()
        # northern hemisphere (unless mapbox does something)
        command = """SELECT * FROM Event WHERE location_lat > %s AND location_lat < %s
            AND location_long < %s and location_long > %s""" % (latSW, latNE, lonNE, lonSW)
        query = conn.execute(command)
        response = {'data': [dict(zip(tuple (query.keys()) ,i)) for i in query.cursor]}
        return response, 200


# (GET) Endpoint for viewing Event information
class Event_Info_All(Resource):
    def get(self):
        conn = e.connect()
        command = "SELECT * FROM Event"
        query = conn.execute(command)
        response = {'data': [dict(zip(tuple (query.keys()) ,i)) for i in query.cursor]}
        return response, 200

# (GET) Endpoint for viewing Event information
class Event_Info(Resource):
    def get(self, event_id):
        conn = e.connect()
        command = "SELECT * FROM Event WHERE event_id = %d"%event_id
        query = conn.execute(command)
        if query.rowcount == 0:
            response = {'data': [{'deleted': True}]}
        else: response = {'data': [dict(zip(tuple (query.keys()) ,i)) for i in query.cursor]}
        return response, 201

# Function: updateScore
# Looks up current score in Event table by the POST request's
# event_id parameter and increments that score by delta. Returns
# delta right now as a placeholder
def updateScore(eventID, vote, scoreThreshold = -100):
    conn = e.connect()
    commandGetEvent = "SELECT * FROM Event WHERE event_id = %d" % (eventID)
    query = conn.execute(commandGetEvent)
    event = [dict(zip(tuple (query.keys()) ,i)) for i in query.cursor][0]
    currScore, lastVerifyScore, lastVerifyTime = updateScoreVote(vote, event)
    if currScore < scoreThreshold:
        commandRemovePin = "DELETE FROM Event WHERE event_id = %d" % (eventID)
        e.execute(commandRemovePin)
        return "Removed";
    commandUpdateCurrScore = "UPDATE Event SET current_score = %f WHERE event_id = %d" %(currScore, eventID)
    commandUpdateLastVerifyScore = "UPDATE Event SET last_verify_score = %f WHERE event_id = %d"%(lastVerifyScore, eventID)
    commandUpdateLastVerifyTime = "UPDATE Event SET last_verify_time = \'%s\' WHERE event_id = %d"%(lastVerifyTime, eventID)
    e.execute(commandUpdateCurrScore)
    e.execute(commandUpdateLastVerifyScore)
    e.execute(commandUpdateLastVerifyTime)
    return currScore

# Function: addEventVote
# Given a an args set with fields vote, time, event_id, and user_id, inserts
# a new EventVote into the EventVote table
def addEventVote(args, vote):
    conn = e.connect()
    time = stringify(args['time'])
    event_id = args['event_id']
    user_id = stringify(args['user_id'])
    location_lat = args['location_lat']
    location_long = args['location_long']
    args['vote'] = vote
    commandInsert = """INSERT INTO EventVote VALUES
            (%s, %s, %d, %s, %f, %f)""" % (vote, time, event_id, user_id, location_lat, location_long)
    conn.execute(commandInsert)
    return args


# (POST) Endpoint for verifying Event
class Verify_Event(Resource):
    def post(self):
        args = parser.parse_args()
        vote = addEventVote(args, '\'verify\'')
        eventID = args['event_id']
        newScore = updateScore(eventID, vote)
        response = {k : v for k, v in args.items() if v}
        response['event_id'] = eventID
        response['new_score'] = newScore
        return response, 201

# (POST) Endpoint for disputing Event
class Dispute_Event(Resource):
    def post(self):
        args = parser.parse_args()
        vote = addEventVote(args, '\'dispute\'')
        EventID = args['event_id']
        newScore = updateScore(EventID, vote)
        response = {k : v for k, v in args.items() if v}
        response['event_id'] = EventID
        response['new_score'] = newScore
        return response, 201

# Add endpoints to API
api.add_resource(User_Info_All, '/user/info/all/')
api.add_resource(User_Info, '/user/info/<string:user_id>')
api.add_resource(Add_New_User, '/user/add/')
api.add_resource(Report_Info_All, '/report/info/all/')
api.add_resource(Report_Info, '/report/info/<int:report_id>')
api.add_resource(Event_Info_All, '/event/info/all/')
api.add_resource(Event_Info_Bounds, '/event/info/bounds/<string:latSW>/<string:lonSW>/<string:latNE>/<string:lonNE>')
api.add_resource(Event_Info, '/event/info/<int:event_id>')
api.add_resource(Add_New_Report, '/report/add/')
api.add_resource(Verify_Event, '/event/verify/')
api.add_resource(Dispute_Event, '/event/dispute/')

if __name__ == '__main__':
     app.run()
