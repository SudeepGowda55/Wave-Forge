Click here to visit the app https://audio-conversion-microservice.vercel.app/ 

The application requires ingress controller and Load Balancer when deployed in k8s

request the controller/gateway at https://endless-cassy-sudeep-project-a4da03fb.koyeb.app/

![Architecture_diagram](https://github.com/SudeepGowda55/Audio_Conversion-Microservice/blob/main/images/mini-arch.png?raw=true)

There are Four Micro Services

1. Gateway Service

Docker File: sudeepgowda55/gateway-service:latest
Docker Run CMD: docker run -p 8000:8000 -d sudeepgowda55/gateway-service:latest
Currently working in: koyeb.app https://endless-cassy-sudeep-project-a4da03fb.koyeb.app/

Example endpoint: https://endless-cassy-sudeep-project-a4da03fb.koyeb.app/validatejwt

2. Authentication Service

Docker File: sudeepgowda55/auth-service:latest
Docker Run CMD: docker run -p 8001:8001 -d sudeepgowda55/auth-service:latest
Currently working in: aws ubuntu ec2 instance http://44.220.136.208:8001/getfiles 

3. Converter Service

Docker File: sudeepgowda55/converter-service:latest
Docker Run CMD: docker run -d sudeepgowda55/converter-service:latest
Currently working in: aws ubuntu ec2 instance http://44.220.136.208

4. Notification Service

Docker File: sudeepgowda55/notification-service:latest
Docker Run CMD: docker run -d sudeepgowda55/notification-service:latest
Currently working in: aws ubuntu ec2 instance http://44.220.136.208

You need to run microservices in this order
1. Authentication Service 
    after the auth service is started, update the auth service ip in gateway service config
2. Gateway service
3. Converter Service and then 
4. Notification Service

Dont Change the order or else IP Addressing will change and services won't work

For debugging 

kubectl get events --sort-by=.metadata.creationTimestamp
