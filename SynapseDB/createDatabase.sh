mysqladmin -ppassword drop -f SynapseDB
mysqladmin -ppassword create SynapseDB
mysql -ppassword SynapseDB < create.sql

mysqlimport -ppassword --fields-terminated-by=';' --lines-terminated-by='\n' --local SynapseDB SynapseUser.dat
mysqlimport -ppassword --fields-terminated-by=';' --lines-terminated-by='\n' --local SynapseDB Event.dat
mysqlimport -ppassword --fields-terminated-by=';' --lines-terminated-by='\n' --local SynapseDB Report.dat
mysqlimport -ppassword --fields-terminated-by=';' --lines-terminated-by='\n' --local SynapseDB EventVote.dat
