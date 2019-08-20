# Usage

Run as a github action workflow
```yaml
steps:
    - name: Generate button
      uses: inextensodigital/actions/javascript/release-button@v1-release
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}
      with:
        deploy-id: 10
````