data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name = "name"
    values = [
      "ubuntu/images/hvm-ssd*/ubuntu-jammy-22.04-amd64-server-*"
    ]
  }

  filter {
    name = "virtualization-type"
    values = [
      "hvm"
    ]
  }

  filter {
    name = "architecture"
    values = [
      "x86_64"
    ]
  }
}

resource "aws_instance" "app_server" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.ec2_instance_type
  subnet_id                   = aws_subnet.public_a.id
  vpc_security_group_ids      = [aws_security_group.ec2_app.id]
  key_name                    = var.ec2_key_name
  iam_instance_profile        = aws_iam_instance_profile.ec2_app.name
  associate_public_ip_address = true

  user_data_replace_on_change = true

  user_data = <<-EOF
    #!/bin/bash
    set -e

    apt-get update -y
    apt-get install -y nginx awscli

    cat > /var/www/html/index.html <<'HTML'
    <!DOCTYPE html>
    <html>
    <head>
      <title>CloudOps Terraform Lab</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #f5f7fb;
          color: #111827;
          padding: 40px;
        }
        .card {
          max-width: 720px;
          margin: auto;
          background: white;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
        }
        code {
          background: #eef2ff;
          padding: 3px 6px;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>CloudOps Terraform Lab</h1>
        <p>This EC2 instance was deployed using Terraform.</p>
        <p>Stage: <code>EC2 web server baseline</code></p>
        <p>Status: <strong>running</strong></p>
      </div>
    </body>
    </html>
    HTML

    echo "ok" > /var/www/html/health

    systemctl enable nginx
    systemctl restart nginx
  EOF

  root_block_device {
    volume_size = 8
    volume_type = "gp3"
    encrypted   = true
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-app-server"
  }
}
