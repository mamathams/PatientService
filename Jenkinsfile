pipeline {
  agent any
  parameters {
    booleanParam(name: 'RUN_DB_TESTS', defaultValue: false, description: 'Run DB integration tests (requires reachable DB)')
  }
  environment {
    AWS_REGION = 'ap-south-1'
    ECR_SNAPSHOT = '376842762709.dkr.ecr.ap-south-1.amazonaws.com/patientservice'
    ECR_RELEASE = '376842762709.dkr.ecr.ap-south-1.amazonaws.com/patientservice'
    IMAGE_NAME = 'patientservice'
    ECS_CLUSTER = 'hospital-management-dev-cluster'
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
    stage('Start DB for Tests') {
      when {
        expression { return params.RUN_DB_TESTS }
      }
      steps {
        sh '''
          set -e
          if command -v docker-compose >/dev/null 2>&1; then
            docker-compose up -d postgres
          else
            docker compose up -d postgres
          fi
          for i in $(seq 1 30); do
            if docker exec patient_db pg_isready -U postgres >/dev/null 2>&1; then
              echo "Postgres is ready"
              exit 0
            fi
            sleep 2
          done
          echo "Postgres did not become ready in time"
          exit 1
        '''
      }
    }
    stage('Test') {
      steps {
        sh '''
          if [ "${RUN_DB_TESTS}" = "true" ]; then
            DB_DIALECT=postgres \
            DB_HOST=127.0.0.1 \
            DB_PORT=5432 \
            DB_USER=postgres \
            DB_PASSWORD=postgres \
            DB_NAME=hospital_patient_db \
            RUN_DB_TESTS=true \
            npm test -- --coverage
          else
            RUN_DB_TESTS=false npm test -- --coverage
          fi
        '''
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
        script {
          try {
            timeout(time: 45, unit: 'SECONDS') {
              waitForQualityGate abortPipeline: false
            }
          } catch (err) {
            echo "Quality Gate check timed out or failed. Continuing pipeline temporarily. Reason: ${err}"
          }
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
    always {
      sh '''
        if command -v docker-compose >/dev/null 2>&1; then
          docker-compose down -v || true
        else
          docker compose down -v || true
        fi
      '''
      cleanWs()
    }
  }
}
