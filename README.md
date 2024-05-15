There are Four Micro Services

1. Gateway Service

Docker File: docker run sudeepgowda55/gateway-service:latest

2. Authentication Service

Docker File: docker run sudeepgowda55/auth-service:latest

3. Converter Service

Docker File: 

4. Notification Service

Docker File: docker run sudeepgowda55/notification-service:latest

You need to run Gateway service First and then Authentication Service Followed by Converter Service and then Notification Service

Dont Change the order or else IP Addressing will change and services won't work