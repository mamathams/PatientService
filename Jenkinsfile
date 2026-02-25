pipeline {
  agent any
  parameters {
    booleanParam(name: 'RUN_DB_TESTS', defaultValue: false, description: 'Run DB integration tests (requires reachable DB)')
    string(name: 'NPM_REGISTRY_URL', defaultValue: '', description: 'Internal Artifactory npm registry URL')
  }
  environment {
    AWS_REGION = 'ap-south-1'
    ECR_SNAPSHOT = '376842762709.dkr.ecr.ap-south-1.amazonaws.com/patientservice'
    ECR_RELEASE = '376842762709.dkr.ecr.ap-south-1.amazonaws.com/patientservice'
    IMAGE_NAME = 'patientservice'
    ECS_CLUSTER = 'hospital-management-prod-cluster'
    ECS_SERVICE = 'patient-service'
  }
  stages {
    stage('Git Checkout') {
      steps {
        checkout scm
      }
    }
    stage('Install') {
      steps {
        sh 'npm install'
      }
    }
    stage('Lint') {
      steps {
        sh 'npm run lint'
      }
    }
    stage('Test') {
      steps {
        sh "RUN_DB_TESTS=${params.RUN_DB_TESTS} npm test -- --coverage"
      }
    }
    stage('SonarQube') {
      steps {
        withSonarQubeEnv('sonarqube') {
          withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
            sh '''
              export PATH=$PATH:/opt/sonar-scanner/bin
              sonar-scanner \
                -Dsonar.host.url=$SONAR_HOST_URL \
                -Dsonar.login=$SONAR_TOKEN
            '''
          }
        }
      }
    }
    stage('Quality Gate') {
      steps {
        timeout(time: 2, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: false
        }
      }
    }
    stage('Checkov') {
      steps {
        sh '''
          if find . -name "*.tf" | grep -q .; then
            checkov -d . --quiet || true
          else
            echo "No Terraform files found. Skipping Checkov."
          fi
        '''
      }
    }
    stage('Trivy Filesystem Scan') {
      steps {
        sh 'trivy fs --exit-code 1 --severity HIGH,CRITICAL . || true'
      }
    }
    stage('Docker Build') {
      steps {
        sh "docker build -t ${ECR_SNAPSHOT}:${env.BUILD_NUMBER} ."
      }
    }
    stage('Trivy Image Scan') {
      steps {
        sh "trivy image --exit-code 1 --severity HIGH,CRITICAL ${ECR_SNAPSHOT}:${env.BUILD_NUMBER} || true"
      }
    }
    stage('Push to ECR Snapshot') {
      steps {
        script {
          withCredentials([aws(credentialsId: 'aws-creds')]) {
            sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin 376842762709.dkr.ecr.ap-south-1.amazonaws.com"
            sh "docker push ${ECR_SNAPSHOT}:${env.BUILD_NUMBER}"
          }
        }
      }
    }
    stage('Push to Release') {
      steps {
        script {
          withCredentials([aws(credentialsId: 'aws-creds')]) {
            sh "docker tag ${ECR_SNAPSHOT}:${env.BUILD_NUMBER} ${ECR_RELEASE}:release-${env.BUILD_NUMBER}"
            sh "docker push ${ECR_RELEASE}:release-${env.BUILD_NUMBER}"
            sh "docker tag ${ECR_SNAPSHOT}:${env.BUILD_NUMBER} ${ECR_RELEASE}:latest"
            sh "docker push ${ECR_RELEASE}:latest"
          }
        }
      }
    }
    stage('Deploy to ECS Fargate') {
      when {
        branch 'main'
      }
      steps {
        script {
          withCredentials([aws(credentialsId: 'aws-creds')]) {
            sh "aws ecs update-service --cluster ${ECS_CLUSTER} --service ${ECS_SERVICE} --force-new-deployment --region ${AWS_REGION}"
            sh "aws ecs wait services-stable --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE} --region ${AWS_REGION}"
          }
        }
      }
    }
  }
  post {
    always { cleanWs() }
  }
}
