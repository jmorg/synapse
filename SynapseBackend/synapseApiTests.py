import urllib2
from flask import Flask
from flask_testing import LiveServerTestCase, TestCase
import unittest
from subprocess import call
import os

#### Reinitialize Database #####
os.chdir("../SynapseDB")
call("./createDatabase.sh", shell = True)
os.chdir("../SynapseBackend")
from synapseApi import app

##### Read in test cases from file #####
testDictionaryFn = "UNIT_TEST_DICTIONARY.txt"
with open(testDictionaryFn) as fin:
	rows = ( line.split('\t') for line in fin )
	testDict = { row[0]:row[1].strip('\n') for row in rows }


# Test harness for GET Methods on the User table
class TEST1_Users(TestCase):
	def create_app(self):
		myapp = app
		myapp.config['TESTING'] = True
		return myapp
	def testAllUsers(self):
		testResponse = testDict['ALL_USERS']
		response = self.client.get('/user/info/all/')
		self.assertEqual(str(response.json), testResponse)

	def testUsersByID(self):
		testID = 1
		testResponse = testDict['USERS_BY_ID']
		response = self.client.get('/user/info/%d'%testID)
		self.assertEqual(str(response.json), testResponse)

# Test harness for GET Methods on the Report table
class TEST2_Reports(TestCase):
	def create_app(self):
		myapp = app
		myapp.config['TESTING'] = True
		return myapp
	def testAllReports(self):
		testResponse = testDict['ALL_REPORTS']
		response = self.client.get('/report/info/all/')
		self.assertEqual(str(response.json), testResponse)

	def testReportsByID(self):
		testID = 1
		testResponse = testDict['REPORTS_BY_ID']
		response = self.client.get('/report/info/%d'%testID)
		self.assertEqual(str(response.json), testResponse)


# Test harness for GET Methods on the Event table
class TEST3_Events(TestCase):
	def create_app(self):
		myapp = app
		myapp.config['TESTING'] = True
		return myapp

	def testAllEvents(self):
		testResponse = testDict['ALL_EVENTS']
		response = self.client.get('/event/info/all/')
		self.assertEqual(str(response.json), testResponse)

	def testEventsByID(self):
		testID = 1
		testResponse = testDict['EVENTS_BY_ID']
		response = self.client.get('/event/info/%d'%testID)
		self.assertEqual(str(response.json), testResponse)

# Test harness for POST Methods
class TEST4_Post_Methods(TestCase):
	def create_app(self):
		myapp = app
		myapp.config['TESTING'] = True
		return myapp

	def test1_testAddUser(self):
		dataDict = {}
		dataDict["user_id"] = 101
		dataDict["home_lat"] = 38.42692
		dataDict["home_long"] = 99.17908
		testResponse = testDict['ADD_USER']
		response = self.client.post('/user/add/', data = dataDict, follow_redirects= True)
		self.assertEqual(str(response.json), testResponse)

	def test2_testAddReport(self):
		dataDict = {}
		dataDict["report_id"] = 102
		dataDict["event_id"] = 103
		dataDict["user_id"] = 101
		dataDict["category"] = "road_closure"
		dataDict["location_lat"] = 38.42692
		dataDict["location_long"] = 99.17908
		dataDict["time"] = "2017-3-14 12:02:07"
		testResponse = testDict['ADD_REPORT']
		response = self.client.post('/report/add/', data = dataDict, follow_redirects= True)
		self.assertEqual(str(response.json), testResponse)

	def test3_testVerifyEvent(self):
		dataDict = {}
		dataDict["event_id"] = 1
		testResponse = testDict['VERIFY_EVENT']
		response = self.client.post('/event/verify/', data = dataDict, follow_redirects= True)
		self.assertEqual(str(response.json), testResponse)

	def test4_testDisputeEvent(self):
		dataDict = {}
		dataDict["event_id"] = 2
		testResponse = testDict['DISPUTE_EVENT']
		response = self.client.post('/event/dispute/', data = dataDict, follow_redirects= True)
		self.assertEqual(str(response.json), testResponse)

if __name__ == '__main__':
    unittest.main()