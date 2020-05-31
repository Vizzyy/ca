import os
import sys
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

from properties import getAddr, getEmailPass

sys.path.append(os.path.abspath("properties.py"))

server = smtplib.SMTP('smtp.gmail.com', 587)
server.starttls()
server.login(getAddr(), getEmailPass())

# Attach image to email
attachment = open("./"+sys.argv[1], "rb")  # file is absolute path
msg = MIMEMultipart()
msg.attach(MIMEText("Motion Event: \n", 'plain'))
msg['From'] = getAddr()
msg['To'] = getAddr()
# try:
# 	if len(sys.argv) >= 3 and sys.argv[2] != "":
# 		msg['To'] = sys.argv[2]
# except Exception as e:
# 	print('{}\n'.format(e))
msg['Subject'] = "Apartment Key"
part = MIMEBase('application', 'octet-stream')
part.set_payload(attachment.read())
encoders.encode_base64(part)
part.add_header('Content-Disposition', "attachment; filename= %s" % str(sys.argv[1]))
msg.attach(part)
try:
	server.sendmail(getAddr(), getAddr(), msg.as_string()) # Send mail -- Can be too large so must catch exception
except Exception as e:
	print('{}\n'.format(e))

server.quit()
