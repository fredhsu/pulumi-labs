Add k8s to the package.json dependencies
Add kubernetes to pulumi plugins : pulumi plugin install resource kubernetes 
npm install in directory to install new dependency
generate public key
`ssh-keygen -t rsa -f key.rsa`
`pulumi config set sshPublicKey < key.rsa.pub`
pulumi up

