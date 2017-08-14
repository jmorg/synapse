from synapseScore import updateScoreTime
from datetime import datetime
from sqlalchemy import *
engine = create_engine('mysql://root:pw@localhost/SynapseDBStage')

def main(threshold = -100):
	toKeep = []
	conn = engine.connect()
	command = "SELECT * FROM Event"
	query = conn.execute(command)
	eventList = [dict(zip(tuple (query.keys()) ,i)) for i in query.cursor]
	for event in eventList:
		currScore = event["current_score"]
		currTime = datetime.now()
		lastVerifyTimeRaw = event["last_verify_time"].strip('\"') #"2007-12-01 01:55:01"
		lastVerifyTime = datetime.strptime(lastVerifyTimeRaw, '%Y-%m-%d %I:%M:%S')
		updatedScore = updateScoreTime(currScore, currTime, lastVerifyTime)
		event["current_score"] = updatedScore
		if updatedScore > threshold:
			toKeep.append(event)
	deleteCommand = "DELETE FROM Event"
	query = conn.execute(deleteCommand)

	for event in toKeep:
		insertCommand = "INSERT INTO Event VALUES (%d, \'%s\', %f, %f, %f, \'%s\', \'%s\', %f, %f)"%(event['event_id'], event['category'], \
						event['radius'], event['current_score'], event['last_verify_score'], event['time'], event['last_verify_time'], event['location_lat'], event['location_long'])
		query = conn.execute(insertCommand)  


if __name__ == '__main__':
	main()
