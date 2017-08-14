mysqladmin -ppassword drop -f SynapseDBStage
mysqladmin -ppassword create SynapseDBStage
mysql -ppassword SynapseDBStage < create.sql

mysqlimport -ppassword --fields-terminated-by=';' --lines-terminated-by='\n' --local SynapseDBStage SynapseUser.dat
mysqlimport -ppassword --fields-terminated-by=';' --lines-terminated-by='\n' --local SynapseDBStage Event.dat
mysqlimport -ppassword --fields-terminated-by=';' --lines-terminated-by='\n' --local SynapseDBStage Report.dat
mysqlimport -ppassword --fields-terminated-by=';' --lines-terminated-by='\n' --local SynapseDBStage EventVote.dat
