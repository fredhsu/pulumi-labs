import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import { create } from "domain";
import * as child from 'child_process';

const config = new pulumi.Config("az-kubeadm");
// const sshPublicKey = config.require("sshPublicKey");
const clientId = config.require("client_id");
const clientSecret = config.require("client_secret");
const subscription_id = config.require("subscription_id");
const tenant_id = config.require("tenant_id");


// TODO: Use this to generate token, change var to collect the stdout token
var foo: child.ChildProcess = child.exec('cat package.json test.js | wc -l', (err, stdout, stderr) => {
  if (err) {
    // node couldn't execute the command
    return;
  }

  // the *entire* stdout and stderr (buffered)
  console.log(`stdout: ${stdout}`);
  console.log(`stderr: ${stderr}`);
});

// Create an Azure Resource Group
const rg = new azure.core.ResourceGroup("fred-kubeadm", {
    location: "WestUS2",
});
const vnet = new azure.network.VirtualNetwork("fred-kubevnet"  , {
    addressSpaces: ["10.0.0.0/16"],
    location: rg.location,
    resourceGroupName: rg.name, 
});

const subnet = new azure.network.Subnet("fred-kubesn", {
    addressPrefix: "10.0.2.0/24",
    resourceGroupName: vnet.resourceGroupName, 
    virtualNetworkName: vnet.name,
});

const cloudConf2 = `
tenantId: ${tenant_id}
aadClientId: ${clientId}
aadClientSecret: ${clientSecret}
subscriptionId: ${subscription_id}
resourceGroup: ${rg.name}
location: ${rg.location}
`;

const masterSetup = `
sudo mkdir -p /etc/kubernetes

sudo echo '${cloudConf2}' > /etc/kubernetes/cloud.conf
`;

const installKube = `#!/bin/bash
curl -s https://gist.githubusercontent.com/fredhsu/f44312907452fee3c538b9d845eb606a/raw/89aad54b8f35f34a0763e1f1fb7bb52ddb9b1e6d/kubeadm-docker-ubuntu.sh | bash

curl -s https://gist.githubusercontent.com/fredhsu/7c96ba5ac52031ce21b761aec199db6d/raw/bb292e5c2980841acb60e2698a0aeecf83345187/install-kubeadm.sh | bash

sudo usermod -aG docker $USER
`;


const cloudConf = `
{
    "tenantId": "0000000-0000-0000-0000-000000000000",
    "aadClientId": "0000000-0000-0000-0000-000000000000",
    "aadClientSecret": "0000000-0000-0000-0000-000000000000",
    "subscriptionId": "0000000-0000-0000-0000-000000000000",
    "resourceGroup": "<name>",
    "location": "eastus",
    "subnetName": "<name>",
    "securityGroupName": "<name>",
    "vnetName": "<name>",
    "vnetResourceGroup": "",
    "useManagedIdentityExtension": false,
    "useInstanceMetadata": true
}
`;
const kubeMasterInit = `#!/bin/bash
sudo kubeadm init
`;

let vms = [];
let ips = [];
for (let i = 1; i <= 3; i++) {
    const pubIP = createPublicIP("fred-kubeip" + i, rg);
    ips.push(pubIP);
    const intf = createNetworkInterface("fred-kubeni" + i, subnet, pubIP, rg);
    const vm = createVM("fred-kubevm" + i, intf, installKube + masterSetup, rg);
    vms.push(vm);
}

function createPublicIP(name: string,rg: azure.core.ResourceGroup) {
    const pubIP = new azure.network.PublicIp(name, {
    allocationMethod: "Static",
    location: rg.location,
    resourceGroupName: rg.name,
    tags: {
        environment: "Demo",
    },
});
return pubIP;
};



function createNetworkInterface(name: string, subnet: azure.network.Subnet, publicIP: azure.network.PublicIp, rg: azure.core.ResourceGroup) {
    const networkIntf = new azure.network.NetworkInterface(name, {
        ipConfigurations: [{
            name: name,
            privateIpAddressAllocation: "Dynamic",
            subnetId: subnet.id,
            publicIpAddressId: publicIP.id,
        }],
        location: rg.location,
        resourceGroupName: rg.name,
    });
    return networkIntf;
}

// createMaster will create a master kubernetes node using pre-generated token
function createMaster() {

}

function createVM(name : string, netintf: azure.network.NetworkInterface, userData : string, rg : azure.core.ResourceGroup) {
    const virtualMachine = new azure.compute.VirtualMachine(name, {
        name: name,
        location: rg.location,
        networkInterfaceIds: [netintf.id],
        osProfile: {
            adminPassword: "Password1234!",
            adminUsername: "fredlhsu",
            computerName: name,
            customData: userData,
        },
        osProfileLinuxConfig: {
            disablePasswordAuthentication: false,
        },
        resourceGroupName: rg.name,
        storageImageReference: {
            offer: "UbuntuServer",
            publisher: "Canonical",
            sku: "16.04-LTS",
            version: "latest",
        },
        storageOsDisk: {
            caching: "ReadWrite",
            createOption: "FromImage",
            managedDiskType: "Standard_LRS",
            name: name + "disk",
        },
        tags: {
            environment: "demo",
        },
        vmSize: "Standard_B2s",
    });
    return virtualMachine;
}

// Export the connection string for the storage account
export const vmsList = vms;
export const subid = subscription_id;
export const pubips = ips;
export const cloudconf = cloudConf2;
export const masterconf = cloudConf2 + masterSetup;