import sys
from dotenv import load_dotenv

def main():
    load_dotenv()
    print("Hello, world!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Keyboard Interrupted")
        try:
            sys.exit(0)
        except SystemExit:
            sys.exit(0)


# ("/convert/mp4-to-mp3")
# ("/convert/mp4-to-wav")
# ("/convert/mp3-to-wav")
# ("/convert/wav-to-mp3")
# ("/changesrate/{fsrate}/{dstfiletype}")
# def changesrate(fsrate: int, dstfiletype: str):
#     return f"Change Sample Rate to {fsrate} and convert to {dstfiletype}"