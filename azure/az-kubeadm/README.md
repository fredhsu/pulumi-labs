## Configure Azure cloud provider
https://github.com/kubernetes/cloud-provider-azure/blob/master/docs/cloud-provider-config.md

## On Master
generate token
kubeadm init --token <token>  --ignore-preflight-errors=NumCPU
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

Need to build config file for Azure/Google - write to /etc/kubernetes/cloud.conf
`sudo mkdir -p /etc/kubernetes/cloud.conf`
Write file
Need to apply CNI

## On workers
fredlhsu@fred-kubevm2:~$ sudo kubeadm join 10.0.2.5:6443 --token <token> --discovery-token-unsafe-skip-ca-verification  

sudo kubeadm join 10.0.2.5:6443 --token xp4rbm.ftlk1egj0hy6adf8 --discovery-token-unsafe-skip-ca-verification  

