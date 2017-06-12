docker build -t ci-mason .
docker tag ci-mason clmscidev.westeurope.cloudapp.azure.com:5000/ci-mason
docker push clmscidev.westeurope.cloudapp.azure.com:5000/ci-mason
