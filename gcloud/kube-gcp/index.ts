import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import { networkInterfaces } from "os";

const computeNetwork = new gcp.compute.Network("network", {
    autoCreateSubnetworks: true,
});

// const computeNetwork = gcp.compute.getNetwork({
//     name: "test",
// });

const computeFirewall = new gcp.compute.Firewall("firewall", {
    network: computeNetwork.selfLink,
    allows: [{
        protocol: "tcp",
        ports: [ "22", "80" ],
    }],
});

// (optional) create a simple web server using the startup script for the instance
const startupScript = `#!/bin/bash
sudo su
curl -s https://gist.githubusercontent.com/fredhsu/f44312907452fee3c538b9d845eb606a/raw/89aad54b8f35f34a0763e1f1fb7bb52ddb9b1e6d/kubeadm-docker-ubuntu.sh | bash

curl -s https://gist.githubusercontent.com/fredhsu/7c96ba5ac52031ce21b761aec199db6d/raw/bb292e5c2980841acb60e2698a0aeecf83345187/install-kubeadm.sh | bash

exit
sudo usermod -aG docker $USER
`;

for (let i = 1; i < 3; i++) {
    createCompute("k8snode-" + i);
}

function createCompute(name : string) {
    const computeInstance = new gcp.compute.Instance(name, {
        machineType: "f1-micro",
        metadataStartupScript: startupScript,
        bootDisk: {
            initializeParams: {
                image: "ubuntu-1604-xenial-v20190325",
            },
        },
        networkInterfaces: [{
            network: computeNetwork.id,
            accessConfigs: [{}], // must be empty to request an ephemeral IP
        }],
        serviceAccount: {
            scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        },
    }, { dependsOn: [computeFirewall] });
    return computeInstance;
}

const computeInstance = new gcp.compute.Instance("instance", {
    machineType: "f1-micro",
    metadataStartupScript: startupScript,
    bootDisk: {
        initializeParams: {
            image: "ubuntu-1604-xenial-v20190325",
        },
    },
    networkInterfaces: [{
        network: computeNetwork.id,
        accessConfigs: [{}], // must be empty to request an ephemeral IP
    }],
    serviceAccount: {
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    },
}, { dependsOn: [computeFirewall] });

exports.instanceName = computeInstance.name;
const netintfs = computeInstance.networkInterfaces[0];
exports.publicIp = netintfs.accessConfigs!.apply(ac => ac![0].natIp);