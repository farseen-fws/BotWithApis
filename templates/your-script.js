$(document).ready(function () {
    let recognition;
    let isRecording = false;
    let isTextSent = false;
    let lastTranscript = '';

    function startRecognition() {
        recognition = new webkitSpeechRecognition();
        $('#record-option').removeClass('d-none').addClass('d-block');
        $('#record-button').removeClass('d-block').addClass('d-none');
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = function (event) {
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    lastTranscript += event.results[i][0].transcript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript + ' ';
                }
            }

            $('.msger-inputarea textarea').val((lastTranscript + interimTranscript).trim());
        };

        recognition.onend = function () {
            console.log('Voice recognition ended.');
            if (isRecording && !isTextSent) {
                isTextSent = true;
                sendRecordedText();
            }
            lastTranscript += ' ';
            lastTranscript = '';
        };

        recognition.start();
        isRecording = true;
    }

    function stopRecognition() {
        if (recognition) {
            recognition.stop();
            $('#record-option').removeClass('d-block').addClass('d-none');
            $('#record-button').removeClass('d-none').addClass('d-block');
            isRecording = false;
        }
    }

    function sendRecordedText() {
        const recordedText = $('.msger-inputarea textarea').val().trim();
        if (recordedText) {
            sendMessage(recordedText);
            isTextSent = true;
            $('.msger-inputarea textarea').val('');
        }
    }

    function sendMessage(message) {
        if (message) {
            // Stop recognition before sending the message
            stopRecognition();

            addMessage('left-msg', message, getCurrentTime());
            $('.msger-inputarea textarea').val('');

            // Add a "typing" message
            const typingMessageId = addMessage('right-msg', '...', getCurrentTime());

            // AJAX request to send message to server and get response
            $.ajax({
                type: 'POST',
                url: '/chat',
                data: { message: message },
                success: function (data) {
                    // Remove the "typing" message
                    document.getElementById(typingMessageId).remove();

                    const botResponse = data.response;
                    addMessage('right-msg', botResponse, getCurrentTime());

                    // Fetch the suggested questions
                    fetch('/suggested-questions')
                        .then(response => response.json())
                        .then(data => {
                            const container = document.querySelector('.msger-chat');
                            document.querySelectorAll('.popup-messages').forEach(e => e.remove());
                            data.questions.forEach(question => {
                                const button = document.createElement('button');
                                button.textContent = question;
                                button.classList.add('popup-messages'); // Add the class here
                                button.addEventListener('click', () => {
                                    sendMessage(question);
                                });
                                container.appendChild(button);
                            });

                            $('.popup-messages').show();
                        });
                },
                error: function () {
                    // Remove the "typing" message
                    document.getElementById(typingMessageId).remove();
                    addMessage('right-msg', 'Error processing your request.', getCurrentTime());
                }
            });
        }
    }

    // Function to add a message to the chat window
    function addMessage(role, content, time) {
        const messageId = 'message-' + Date.now();

        let messageContent;
        if (content === '...') {
            messageContent = '<div class="typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
        } else {
            messageContent = content;
        }

        const messageDiv = $('<div>').attr('id', messageId).addClass('msg ' + role).html(
            '<div class="msg-bubble">' +
            '<div class="msg-info ' + (role === 'right-msg' ? 'msg-info-right' : '') + '">' +
            '<div class="msg-info-time">' + time + '</div>' +
            '</div>' +
            '<div class="msg-text">' + messageContent + '</div>' +
            '</div>'
        );
        $('.msger-chat').append(messageDiv);
        $('.msger-chat').scrollTop($('.msger-chat').prop('scrollHeight'));
        return messageId;
    }

    // Function to get the current time
    function getCurrentTime() {
        const now = new Date();
        return now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
    }

    // Event listeners
    $('.msger-send-btn').click(function () {
        const userQuestion = $('.msger-inputarea textarea').val().trim();
        if (userQuestion) {
            sendMessage(userQuestion);
        }
    });

    $('.msger-inputarea textarea').keydown(function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const userQuestion = $('.msger-inputarea textarea').val().trim();
            if (userQuestion) {
                sendMessage(userQuestion);
            }
        }
    });

    $('.blantershow-chat').click(function () {
        $('#whatsapp-chat').removeClass('hide').addClass('show');
    });

    $('.close-chat').click(function () {
        const container = document.getElementById('suggested-questions');
        container.innerHTML = '';
        $('.popup-messages').remove();  // Remove the popup messages

        $('.msger-chat .msg').remove();
        $('#whatsapp-chat').removeClass('show').addClass('hide');
        $.ajax({
            type: 'POST',
            url: '/clear-conversation'
        });
    });

    $('#record-button').click(function (event) {
        event.preventDefault();
        if (!isRecording) {
            startRecognition();
        } else {
            stopRecognition();
            isTextSent = false;
        }
    });

    $('#record-option').click(function (event) {
        event.preventDefault();
        stopRecognition();
    });
});
