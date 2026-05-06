"""
#############################################################################
### AWS Lambda handler for FastAPI application
###
### @file lambda_handler.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module wraps the FastAPI application for AWS Lambda deployment.
"""

from mangum import Mangum
from main import app

# Configure Mangum for Lambda
handler = Mangum(app, lifespan="off", api_gateway_base_path="/")

# For local testing
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)