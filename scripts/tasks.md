How to run

Save the script at scripts\restructure_and_push.ps1.
From PowerShell in the project root:
Allow script: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
Run locally without pushing first: .\scripts\restructure_and_push.ps1
If everything looks good and you want to push: .\scripts\restructure_and_push.ps1 -Push
Notes and safety

The script creates manifest.json.bak before modifying manifest.json.
It removes tracked client_secret_* files from git index before commit.
Pushing requires that your git credentials are available on the machine (Git credential manager, SSH key, or PAT).
Review changes after running (git status, git diff) before pushing.
If you want, run the script and paste any errors or the output and I’ll guide any fixes.