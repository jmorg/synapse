from vincenty import vincenty
from collections import namedtuple
import math


def exponentialDecay(distance, maxDelta = 10, k = 1):
	return maxDelta * pow(math.e, -k * distance)

def extractVoteFeatures(vote):
	voteCoef = 1 if vote['vote'] == "\'verify\'" else -1
	voteLocation = (vote['location_lat'], vote['location_long'])
	return voteCoef, voteLocation

def extractEventFeatures(event):
	eventLocation = (event['location_lat'], event['location_long'])
	lastVerifyScore = event['last_verify_score']
	currScore = event['current_score']
	lastVerifyTime = event['last_verify_time']
	return eventLocation, currScore, lastVerifyScore, lastVerifyTime

def updateScoreVote(vote, event, maxScore = 100):
	voteCoef, voteLocation = extractVoteFeatures(vote)
	eventLocation, currScore, lastVerifyScore, lastVerifyTime = extractEventFeatures(event)
	distance = vincenty(eventLocation, voteLocation, miles = True)
	if voteCoef == 1: lastVerifyTime = vote['time']
	distanceMulti = exponentialDecay(distance)
	currScore = currScore + (voteCoef * distanceMulti)
	if currScore > maxScore: currScore = maxScore
	if voteCoef == 1: lastVerifyScore = currScore
	return currScore, lastVerifyScore, lastVerifyTime


def updateScoreTime(currScore, currTime, lastVerifyTime, threshold = 10):
	timeDiff = (currTime - lastVerifyTime).seconds
	secondThreshold = threshold * 60
	if timeDiff < secondThreshold: return
	currScore = currScore - (timeDiff / secondThreshold)
	return currScore



