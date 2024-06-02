Currently its running Digital ocean kubernetes Cluster with ingress controller and Load Balancer 

make request to controler https://kube.nostrclient.social/

example post request to https://kube.nostrclient.social/validatejwt

There are Four Micro Services

1. Gateway Service

Docker File: docker run -p 8000:8000 sudeepgowda55/gateway-service:latest

2. Authentication Service

Docker File: docker run sudeepgowda55/auth-service:latest

3. Converter Service

Docker File: 

4. Notification Service

Docker File: docker run sudeepgowda55/notification-service:latest

You need to run Gateway service First and then Authentication Service Followed by Converter Service and then Notification Service

Dont Change the order or else IP Addressing will change and services won't work

After all the Docker containers are running make http requests to http://localhost:8000/