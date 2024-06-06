import sys
from rabbitmq import pikapc

def main():
    print("Converter Service is running")
    pikapc.consume_from_file_uploaded_queue()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Keyboard Interrupted")
        try:
            sys.exit(0)
        except SystemExit:
            sys.exit(0)