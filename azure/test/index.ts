import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import { inherits } from "util";
import { VirtualMachine } from "@pulumi/azure/compute";

const azureRegions = [
    "eastasia",
    "southeastasia",
    "centralus",
    "eastus",
    "eastus2",
    "westus",
    "northcentralus",
    "southcentralus",
    "northeurope",
    "westeurope",
    "japanwest",
    "japaneast",
    "brazilsouth",
    "australiaeast",
    "australiasoutheast",
    "southindia",
    "centralindia",
    "westindia",
    "canadacentral",
    "canadaeast",
    "uksouth",
    "ukwest",
    "westcentralus",
    "westus2",
    "koreacentral",
    "koreasouth",
    "francecentral",
    "francesouth",
    "australiacentral",
    "australiacentral2",
    "southafricanorth",
    "southafricawest"
  ];

const testRegions = [
    // "eastasia",
    "centralus",
    "eastus",
    "westus",
    "northcentralus",
    "northeurope",
    "japanwest",
    "brazilsouth",
    "australiasoutheast",
    "southindia",
    "westindia",
    "canadaeast",
    "uksouth",
    "westcentralus",
    "westus2",
    "koreacentral",
    "francecentral",
    "southafricanorth",
  ];

const testRegions2 = [
    "eastasia",
    "centralus",
    "eastus",
    "westus",
    "northcentralus",
    "northeurope",
    "japanwest",
    "brazilsouth",
    "australiasoutheast",
    "southindia",
    "westindia",
    "canadaeast",
    "uksouth",
    "westcentralus",
    "westus2", 
    "southafricanorth",
]
//   const testRegions2 = [
//     'centralus,eastasia,southeastasia,eastus,eastus2,westus,westus2,northcentralus,southcentralus,westcentralus,northeurope,westeurope,japaneast,japanwest,brazilsouth,australiasoutheast,australiaeast,westindia,southindia,centralindia,canadacentral,canadaeast,uksouth,ukwest,koreacentral,koreasouth,francecentral,southafricanorth'
//   ];

const resourceGroups = testRegions.map(region => 
   new azure.core.ResourceGroup("fred" + region, {
       location: region,
   }));

const artifacts = resourceGroups.map(rg =>
    rg.location.apply(loc => {
        const vnet = new azure.network.VirtualNetwork(loc.slice(-16)  , {
        addressSpaces: ["10.0.0.0/16"],
        location: rg.location,
        resourceGroupName: rg.name, 
    });
     const subnet = createSubnet(loc, vnet);
     const pubIP = createPublicIP(loc, rg);
     const intf = createNetworkInterface(loc, subnet, pubIP, rg);
     const vm = createVM(loc, intf, rg);
     const artifact = {loc: loc, subnet:subnet, pubIP : pubIP, intf : intf, vm : vm}
     return artifact;
}));

function createSubnet(loc : String, vn : azure.network.VirtualNetwork) {
    const subnet = new azure.network.Subnet(loc.slice(-16), {
        addressPrefix: "10.0.2.0/24",
        resourceGroupName: vn.resourceGroupName, 
        virtualNetworkName: vn.name,
    })
    return subnet;
};

function createPublicIP(loc: String,rg: azure.core.ResourceGroup) {
    const pubIP = new azure.network.PublicIp(loc.slice(-16), {
    allocationMethod: "Static",
    location: rg.location,
    resourceGroupName: rg.name,
    tags: {
        environment: "Demo",
    },
});
return pubIP;
};

function createNetworkInterface(loc: String, subnet: azure.network.Subnet, publicIP: azure.network.PublicIp, rg: azure.core.ResourceGroup) {
    const networkIntf = new azure.network.NetworkInterface(loc.slice(-16), {
        ipConfigurations: [{
            name: "test",
            privateIpAddressAllocation: "Dynamic",
            subnetId: subnet.id,
            publicIpAddressId: publicIP.id,
        }],
        location: rg.location,
        resourceGroupName: rg.name,
    });
    return networkIntf;
}

const userData = `#!/bin/bash
echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &`;

function createVM(loc : String, netintf: azure.network.NetworkInterface, rg : azure.core.ResourceGroup) {
    const virtualMachine = new azure.compute.VirtualMachine(loc.slice(-16), {
        location: rg.location,
        networkInterfaceIds: [netintf.id],
        osProfile: {
            adminPassword: "Password1234!",
            adminUsername: "fredlhsu",
            computerName: "hostname",
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
            name: "myosdisk1",
        },
        tags: {
            environment: "demo",
            autostop: "no",
        },
        vmSize: "Standard_B1s",
    });
    return virtualMachine;
}
// export const vmPublicIP = mainPublicIP.ipAddress;
export const locations = artifacts.map(endpoint => 
    { 
        const ipaddr = endpoint.pubIP.apply(ip => ip.ipAddress);
        return {
        host : endpoint.loc, 
        ipAddress : ipaddr,
        url: pulumi.interpolate `http://${ipaddr}` ,
    }})
export const ips = artifacts.map(endpoint => 
    endpoint.pubIP.apply(i => i.ipAddress));
