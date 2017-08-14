from sqlalchemy import *
from vincenty import vincenty
from collections import defaultdict
import math


# Function: createEventDict
# This function returns a dictionary mapping
# category name to a list of events of that category
def createEventDict(engine):
	eventDict = defaultdict(list)
	conn = engine.connect()
	command = "SELECT * FROM Event"
	query = conn.execute(command)
	response = [dict(zip(tuple (query.keys()) ,i)) for i in query.cursor]
	for event in response:
		eventDict[event['category']].append(event)
	return eventDict

# Function: midpoint
# This function returns the midpoint of two
# gps coordinates. It is adapted from:
# http://code.activestate.com/recipes/577713-midpoint-of-two-gps-points/
def midpoint(x1, x2, y1, y2):
    lat1 = math.radians(x1)
    lon1 = math.radians(x2)
    lat2 = math.radians(y1)
    lon2 = math.radians(y2)

    bx = math.cos(lat2) * math.cos(lon2 - lon1)
    by = math.cos(lat2) * math.sin(lon2 - lon1)
    lat3 = math.atan2(math.sin(lat1) + math.sin(lat2), \
           math.sqrt((math.cos(lat1) + bx) * (math.cos(lat1) \
           + bx) + by**2))
    lon3 = lon1 + math.atan2(by, math.cos(lat1) + bx)

    return round(math.degrees(lat3), 6), round(math.degrees(lon3), 6)

# Function: merge
# This function merges two events as follows:
# 1) Choose the event with the higher score as 
#	 the event to 'keep' as the mergedEvent
# 2) Update the mergedEvent score to be the
#    sum of the two event scores
# 3) Update the mergedEvent location to be the
#    midpoint of the two events
def merge(event1, event2):
	mergedEvent= event1 if event1['current_score'] >= event2['current_score'] else event2
	mergedEvent['current_score'] = event1['current_score'] + event2['current_score']
	mergedEvent['last_verify_score'] = event1['last_verify_score'] + event2['last_verify_score']
	return mergedEvent

# Function: canMerge
# This function returns true if the two events
# passed in meet the merge criteria, which currently
# is just a distance threshold.
def canMerge(event1, event2, threshold = 0.05):
	 distance = vincenty((event1['location_lat'], event2['location_long']), 
	 			(event2['location_lat'], event2['location_long']), miles = True)
	 return distance <= threshold

# Function: mergeEvents
# This function iterates through all the events
# in a category and merges them appropriately. It 
# returns a list containing all the events that should
# be placed in the table. If no events were merged, this
# list would be same as the events already in the table.
def mergeEvents(eventDict, category, verbose = False):
	eventList = eventDict[category]
	initialNumEvents = len(eventList)
	mergedEvents = []
	currentIndex = 0
	while len(eventList) > 0:
		mergedEvent = eventList[currentIndex]
		toRemove = [currentIndex]
		#print mergedEvent
		for i, event2 in enumerate(eventList[currentIndex + 1:]):
			if canMerge(mergedEvent, event2):
				mergedEvent = merge(mergedEvent, event2)
				toRemove.append(i + 1)
				if verbose: print "merging event %d with event %d"%(mergedEvent['event_id'], event2['event_id'])
		eventList = [i for j, i in enumerate(eventList) if j not in toRemove]
		mergedEvents.append(mergedEvent)
	if verbose: print "%d events were merged" % (initialNumEvents - len(mergedEvents))
	return mergedEvents

def getEventObject(event_id, engine):
	conn = engine.connect()
	getEventCommand = "SELECT * FROM Event WHERE event_id = %d"%(event_id)
	query = conn.execute(getEventCommand)
	return [dict(zip(tuple (query.keys()) ,i)) for i in query.cursor][0]

def mergeOneEvent(eventDict, event_id, engine):
	event = getEventObject(event_id, engine)
	category = event["category"]
	eventList = eventDict[category]
	toRemoveIDs = None
	mergedEvent= None
	for i, event2 in enumerate(eventList):
		if event["event_id"] == event2["event_id"]: continue
		if canMerge(event, event2):
			print("merging %d with %d"%(event["event_id"], event2["event_id"]))
			mergedEvent = merge(event, event2)
			toRemoveIDs = event['event_id'], event2['event_id']
			break;

	return mergedEvent, toRemoveIDs

# Function: updateDatabase
# This function removes all events of a specified
# category from the event table, then adds in all the
# events in mergedEvents.
def updateDatabase(mergedEvents, category, engine):
	conn = engine.connect()
	deleteCommand = "DELETE FROM Event WHERE category = \'%s\'"%category
	query = conn.execute(deleteCommand)
	for event in mergedEvents:
		insertCommand = "INSERT INTO Event VALUES (%d, \'%s\', %f, %f, %f, \'%s\', \'%s\', %f, %f)"%(event['event_id'], event['category'], \
						event['radius'], event['current_score'], event['last_verify_score'], event['time'], event['last_verify_time'], event['location_lat'], event['location_long'])
		query = conn.execute(insertCommand)

def updateDatabaseOneEvent(event, toRemoveIDs, engine):
	conn = engine.connect()
	deleteCommand = "DELETE FROM Event WHERE event_id IN (%d, %d)" %(toRemoveIDs[0], toRemoveIDs[1])
	query = conn.execute(deleteCommand)
	insertCommand = "INSERT INTO Event VALUES (%d, \'%s\', %f, %f, %f, \'%s\', \'%s\', %f, %f)"%(event['event_id'], event['category'], \
						event['radius'], event['current_score'], event['last_verify_score'], event['time'], event['last_verify_time'], event['location_lat'], event['location_long'])
	query = conn.execute(insertCommand)

#Function: doMergeJob
# This function does the merge event routine
# on a specific category of events. If the verbose
# flag is true, simple debugging lines are
# printed to the console.
def doMergeJob(category, engine, verbose = False):
	eventDict = createEventDict(engine)
	if verbose: print "There are %d %s events" % (len(eventDict[category]), category)
	numBefore = len(eventDict[category])
	#mergedEvents = mergeEvents(eventDict, category, verbose)
	#updateDatabase(mergedEvents, category, engine)
	mergeOneEvent(eventDict, event)
	updateDatabaseOneEvent(event, toRemoveIDs, engine)
	numAfter = len(eventDict[category])
	if verbose: 
		eventDict = createEventDict(engine)
		print "There are now %d %s events" % (len(eventDict[category]), category)
	return numAfter < numBefore

def doMergeJobOneEvent(event_id, category, engine, verbose = False):
	eventDict = createEventDict(engine)
	if verbose: print "There are %d %s events" % (len(eventDict[category]), category)
	numBefore = len(eventDict[category])
	#mergedEvents = mergeEvents(eventDict, category, verbose)
	#updateDatabase(mergedEvents, category, engine)
	mergedEvent, toRemoveIds = mergeOneEvent(eventDict, event_id, engine)
	if (toRemoveIds): updateDatabaseOneEvent(mergedEvent, toRemoveIds, engine)
	numAfter = len(eventDict[category])
	if verbose: 
		eventDict = createEventDict(engine)
		print "There are now %d %s events" % (len(eventDict[category]), category)
	return mergedEvent